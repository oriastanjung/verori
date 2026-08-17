use std::fs;
use std::path::PathBuf;

const DEFAULT_OUTPUT: &str = "openapi.json";

fn main() {
    let output = std::env::args()
        .nth(1)
        .map(PathBuf::from)
        .unwrap_or_else(|| PathBuf::from(DEFAULT_OUTPUT));

    let document = api::openapi_document();
    let json = document.to_pretty_json().expect("openapi must serialize");

    if let Some(parent) = output.parent() {
        fs::create_dir_all(parent).expect("failed to create output directory");
    }

    fs::write(&output, json).expect("failed to write openapi file");

    println!("wrote {}", output.display());
}
