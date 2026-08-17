//! `#[transactional]` for service methods.
//!
//! Put it **above** `#[async_trait]` and mark the methods you want wrapped
//! with `#[tx]`:
//!
//! ```ignore
//! #[transactional]
//! #[async_trait]
//! impl ExampleService for DefaultExampleService {
//!     #[tx]
//!     async fn create(&self, input: CreateExampleRequest) -> AppResult<ExampleResponse> {
//!         let record = self.repository.create(input).await?;  // same transaction
//!         self.repository.touch(record.id).await?;            // same transaction
//!         Ok(record.into())
//!     }
//! }
//! ```
//!
//! The marked body runs in one transaction: it commits on `Ok`, rolls back on
//! `Err`, and a serialisation failure or deadlock is retried.
//!
//! The order matters. `#[async_trait]` rewrites `async fn` into a boxed future,
//! so this attribute has to run first.
//!
//! Two requirements:
//!
//! - the type needs a `db` field holding a `DatabaseConnection`, or name
//!   another one with `#[transactional(db = "pool")]`
//! - arguments of marked methods must be `Clone`, because a retry rebuilds the
//!   body. Use `#[transactional(retries = 1)]` when they are not.

use proc_macro::TokenStream;
use quote::quote;
use syn::parse::{Parse, ParseStream};
use syn::{
    parse_macro_input, FnArg, Ident, ImplItem, ImplItemFn, ItemImpl, LitInt, LitStr, Pat, Token,
};

const DEFAULT_DB_FIELD: &str = "db";
const DEFAULT_RETRIES: u32 = 3;
const MARKER: &str = "tx";

struct Options {
    db_field: Ident,
    retries: u32,
}

impl Parse for Options {
    fn parse(input: ParseStream) -> syn::Result<Options> {
        let mut db_field = Ident::new(DEFAULT_DB_FIELD, proc_macro2::Span::call_site());
        let mut retries = DEFAULT_RETRIES;

        while !input.is_empty() {
            let key: Ident = input.parse()?;
            input.parse::<Token![=]>()?;

            if key == "db" {
                let value: LitStr = input.parse()?;
                db_field = Ident::new(&value.value(), value.span());
            } else if key == "retries" {
                let value: LitInt = input.parse()?;
                retries = value.base10_parse()?;
            } else {
                return Err(syn::Error::new(key.span(), "expected `db` or `retries`"));
            }

            if !input.is_empty() {
                input.parse::<Token![,]>()?;
            }
        }

        Ok(Options { db_field, retries })
    }
}

/// Collects argument names so the generated closure can clone them per attempt.
fn argument_names(function: &ImplItemFn) -> syn::Result<Vec<Ident>> {
    let mut names = Vec::new();

    for argument in &function.sig.inputs {
        let FnArg::Typed(typed) = argument else {
            continue;
        };

        match typed.pat.as_ref() {
            Pat::Ident(pattern) => names.push(pattern.ident.clone()),
            other => {
                return Err(syn::Error::new_spanned(
                    other,
                    "#[transactional] needs plain argument names, not patterns",
                ))
            }
        }
    }

    Ok(names)
}

fn wrap(function: &mut ImplItemFn, db_field: &Ident, retries: u32) -> syn::Result<()> {
    if function.sig.asyncness.is_none() {
        return Err(syn::Error::new_spanned(
            function.sig.fn_token,
            "#[tx] only applies to async methods. Is #[transactional] above #[async_trait]?",
        ));
    }

    let names = argument_names(function)?;
    let body = &function.block;

    let wrapped = quote! {
        {
            ::db::tx::run(
                &self.#db_field,
                #retries,
                || {
                    #( let #names = ::core::clone::Clone::clone(&#names); )*
                    async move #body
                },
            )
            .await
        }
    };

    function.block = syn::parse2(wrapped)?;
    Ok(())
}

#[proc_macro_attribute]
pub fn transactional(attribute: TokenStream, item: TokenStream) -> TokenStream {
    let options = parse_macro_input!(attribute as Options);
    let mut block = parse_macro_input!(item as ItemImpl);

    for item in &mut block.items {
        let ImplItem::Fn(function) = item else {
            continue;
        };

        let marked = function
            .attrs
            .iter()
            .any(|attribute| attribute.path().is_ident(MARKER));

        if !marked {
            continue;
        }

        function
            .attrs
            .retain(|attribute| !attribute.path().is_ident(MARKER));

        if let Err(error) = wrap(function, &options.db_field, options.retries) {
            return error.to_compile_error().into();
        }
    }

    quote!(#block).into()
}
