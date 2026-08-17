//! Builds the OpenAPI document the docs page and the codegen both use.
//!
//! Better Auth generates its own spec, and there is no library level merge, so
//! the two `paths` objects are joined here by hand.

use serde_json::{json, Map, Value};

use auth::Auth;

/// Better Auth mounts its routes here, but its own spec lists them unprefixed.
const AUTH_PREFIX: &str = "/api/auth";
const AUTH_TAG: &str = "auth";

/// Merges the Better Auth routes into the utoipa document.
pub fn merged_spec(app_spec: &utoipa::openapi::OpenApi, auth: &Auth) -> Value {
    let mut document = serde_json::to_value(app_spec).expect("openapi must serialize");
    let auth_spec = serde_json::to_value(auth.openapi_spec()).expect("auth spec must serialize");

    let Some(auth_paths) = auth_spec.get("paths").and_then(Value::as_object) else {
        return document;
    };

    let paths = document
        .get_mut("paths")
        .and_then(Value::as_object_mut)
        .expect("an openapi document always has paths");

    for (path, operations) in auth_paths {
        paths.insert(format!("{AUTH_PREFIX}{path}"), tagged(operations));
    }

    add_auth_tag(&mut document);
    document
}

/// Puts every auth operation under one tag so the docs page groups them.
fn tagged(operations: &Value) -> Value {
    let Some(operations) = operations.as_object() else {
        return operations.clone();
    };

    let mut result = Map::new();

    for (method, operation) in operations {
        let mut operation = operation.clone();
        if let Some(object) = operation.as_object_mut() {
            object.insert("tags".to_string(), json!([AUTH_TAG]));
        }
        result.insert(method.clone(), operation);
    }

    Value::Object(result)
}

fn add_auth_tag(document: &mut Value) {
    let Some(object) = document.as_object_mut() else {
        return;
    };

    let tags = object
        .entry("tags")
        .or_insert_with(|| Value::Array(Vec::new()));

    if let Some(list) = tags.as_array_mut() {
        list.push(json!({
            "name": AUTH_TAG,
            "description": "Sign up, sign in, sessions, password and admin user management",
        }));
    }
}
