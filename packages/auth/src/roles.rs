//! Role based access control. Roles and their permissions are declared here so
//! there is one place to look when you need to know who may do what.

use std::collections::HashMap;

use better_auth::plugins::{AdminConfig, RolePermissions};

pub const USER_ROLE: &str = "user";
pub const ADMIN_ROLE: &str = "admin";

/// Resources the admin plugin knows about.
const RESOURCE_USER: &str = "user";
const RESOURCE_SESSION: &str = "session";
const RESOURCE_EXAMPLE: &str = "example";

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Role {
    User,
    Admin,
}

impl Role {
    pub fn as_str(&self) -> &'static str {
        match self {
            Role::User => USER_ROLE,
            Role::Admin => ADMIN_ROLE,
        }
    }

    pub fn parse(value: &str) -> Option<Role> {
        match value {
            USER_ROLE => Some(Role::User),
            ADMIN_ROLE => Some(Role::Admin),
            _ => None,
        }
    }

    pub fn is_admin(&self) -> bool {
        matches!(self, Role::Admin)
    }
}

/// A plain user may only read and update their own example records.
fn user_permissions() -> RolePermissions {
    RolePermissions::new().allow(RESOURCE_EXAMPLE, ["read", "create", "update"])
}

/// An admin may manage users and sessions on top of everything a user can do.
fn admin_permissions() -> RolePermissions {
    RolePermissions::new()
        .allow(RESOURCE_EXAMPLE, ["read", "create", "update", "delete"])
        .allow(
            RESOURCE_USER,
            ["list", "create", "update", "delete", "ban", "set-role"],
        )
        .allow(RESOURCE_SESSION, ["list", "revoke"])
}

pub fn admin_config() -> AdminConfig {
    let roles = HashMap::from([
        (USER_ROLE.to_string(), user_permissions()),
        (ADMIN_ROLE.to_string(), admin_permissions()),
    ]);

    AdminConfig {
        default_role: USER_ROLE.to_string(),
        admin_roles: vec![ADMIN_ROLE.to_string()],
        roles,
        ..AdminConfig::default()
    }
}
