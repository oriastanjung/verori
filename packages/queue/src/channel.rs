use std::fmt;

/// Every queue name in the system. Add a variant here before you can publish to it.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum QueueChannel {
    ExampleCreated,
    ExamplePublished,
}

impl QueueChannel {
    pub const ALL: &'static [QueueChannel] = &[
        QueueChannel::ExampleCreated,
        QueueChannel::ExamplePublished,
    ];

    pub fn as_str(&self) -> &'static str {
        match self {
            QueueChannel::ExampleCreated => "example_created",
            QueueChannel::ExamplePublished => "example_published",
        }
    }

    pub fn parse(value: &str) -> Option<QueueChannel> {
        QueueChannel::ALL
            .iter()
            .copied()
            .find(|channel| channel.as_str() == value)
    }
}

impl fmt::Display for QueueChannel {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter.write_str(self.as_str())
    }
}
