use std::collections::BTreeMap;

pub const WORLD_WIDTH: i32 = 18;
pub const WORLD_HEIGHT: i32 = 12;
pub const STATE_VERSION: u32 = 2;
pub const BASE_VERSION: &str = "sereine-native:1";

#[derive(Clone, Copy, Debug, Default, Eq, Hash, Ord, PartialEq, PartialOrd)]
pub struct Pos {
    pub x: i32,
    pub y: i32,
}

impl Pos {
    #[must_use]
    pub const fn new(x: i32, y: i32) -> Self {
        Self { x, y }
    }

    #[must_use]
    pub const fn manhattan(self, other: Self) -> u32 {
        self.x.abs_diff(other.x) + self.y.abs_diff(other.y)
    }

    #[must_use]
    pub fn neighbors(self) -> [Self; 4] {
        [
            Self::new(self.x, self.y - 1),
            Self::new(self.x + 1, self.y),
            Self::new(self.x, self.y + 1),
            Self::new(self.x - 1, self.y),
        ]
    }
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum Terrain {
    Grass,
    Path,
    Water,
    Cliff,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum Direction {
    Up,
    Right,
    Down,
    Left,
}

impl Direction {
    #[must_use]
    pub const fn delta(self) -> (i32, i32) {
        match self {
            Self::Up => (0, -1),
            Self::Right => (1, 0),
            Self::Down => (0, 1),
            Self::Left => (-1, 0),
        }
    }

    #[must_use]
    pub const fn code(self) -> &'static str {
        match self {
            Self::Up => "U",
            Self::Right => "R",
            Self::Down => "D",
            Self::Left => "L",
        }
    }

    #[must_use]
    pub fn parse(code: &str) -> Option<Self> {
        match code {
            "U" => Some(Self::Up),
            "R" => Some(Self::Right),
            "D" => Some(Self::Down),
            "L" => Some(Self::Left),
            _ => None,
        }
    }
}

#[derive(Clone, Copy, Debug, Eq, Hash, Ord, PartialEq, PartialOrd)]
pub enum ResourceKind {
    Wood,
    Stone,
    Fiber,
}

impl ResourceKind {
    #[must_use]
    pub const fn label(self) -> &'static str {
        match self {
            Self::Wood => "bois",
            Self::Stone => "pierre",
            Self::Fiber => "fibres",
        }
    }
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Inventory {
    pub wood: u16,
    pub stone: u16,
    pub fiber: u16,
}

impl Inventory {
    #[must_use]
    pub const fn empty() -> Self {
        Self {
            wood: 0,
            stone: 0,
            fiber: 0,
        }
    }

    #[must_use]
    pub const fn get(&self, kind: ResourceKind) -> u16 {
        match kind {
            ResourceKind::Wood => self.wood,
            ResourceKind::Stone => self.stone,
            ResourceKind::Fiber => self.fiber,
        }
    }

    pub fn add(&mut self, kind: ResourceKind, amount: u16) {
        let slot = match kind {
            ResourceKind::Wood => &mut self.wood,
            ResourceKind::Stone => &mut self.stone,
            ResourceKind::Fiber => &mut self.fiber,
        };
        *slot = slot.saturating_add(amount);
    }

    pub fn take(&mut self, kind: ResourceKind, amount: u16) -> bool {
        let slot = match kind {
            ResourceKind::Wood => &mut self.wood,
            ResourceKind::Stone => &mut self.stone,
            ResourceKind::Fiber => &mut self.fiber,
        };
        if *slot < amount {
            return false;
        }
        *slot -= amount;
        true
    }

    #[must_use]
    pub fn can_pay(&self, cost: &[(ResourceKind, u16)]) -> bool {
        cost.iter().all(|(kind, amount)| self.get(*kind) >= *amount)
    }

    pub fn pay(&mut self, cost: &[(ResourceKind, u16)]) -> bool {
        if !self.can_pay(cost) {
            return false;
        }
        for (kind, amount) in cost {
            let paid = self.take(*kind, *amount);
            debug_assert!(paid);
        }
        true
    }
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ResourceSite {
    pub id: String,
    pub kind: ResourceKind,
    pub pos: Pos,
    pub active: bool,
    pub depleted_until: u64,
    pub pressure: u16,
    pub exhausted: bool,
    pub harvests: u16,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Resident {
    pub id: String,
    pub name: String,
    pub pos: Pos,
    pub route: Vec<Pos>,
    pub route_cursor: usize,
    pub need: ResourceKind,
    pub energy: u16,
    pub relation: u8,
    pub helped: bool,
    pub displaced: bool,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum StructureKind {
    Marker,
    Hearth,
    Workshop,
    Bridge,
    Recovery,
    Shelter,
    Fence,
    Store,
}

impl StructureKind {
    #[must_use]
    pub const fn label(self) -> &'static str {
        match self {
            Self::Marker => "balise",
            Self::Hearth => "foyer",
            Self::Workshop => "atelier",
            Self::Bridge => "pont",
            Self::Recovery => "aire de reprise",
            Self::Shelter => "abri",
            Self::Fence => "clôture",
            Self::Store => "réserve",
        }
    }

    #[must_use]
    pub const fn code(self) -> &'static str {
        match self {
            Self::Marker => "MARKER",
            Self::Hearth => "HEARTH",
            Self::Workshop => "WORKSHOP",
            Self::Bridge => "BRIDGE",
            Self::Recovery => "RECOVERY",
            Self::Shelter => "SHELTER",
            Self::Fence => "FENCE",
            Self::Store => "STORE",
        }
    }

    #[must_use]
    pub fn parse(code: &str) -> Option<Self> {
        match code {
            "MARKER" => Some(Self::Marker),
            "HEARTH" => Some(Self::Hearth),
            "WORKSHOP" => Some(Self::Workshop),
            "BRIDGE" => Some(Self::Bridge),
            "RECOVERY" => Some(Self::Recovery),
            "SHELTER" => Some(Self::Shelter),
            "FENCE" => Some(Self::Fence),
            "STORE" => Some(Self::Store),
            _ => None,
        }
    }
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Structure {
    pub id: u64,
    pub kind: StructureKind,
    pub pos: Pos,
    pub condition: u8,
    pub active: bool,
}

#[derive(Clone, Copy, Debug, Default, Eq, PartialEq)]
pub struct Usage {
    pub player: u16,
    pub residents: u16,
}

impl Usage {
    #[must_use]
    pub const fn total(self) -> u16 {
        self.player.saturating_add(self.residents)
    }
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum PathState {
    Wild,
    Trail,
    Road,
    Inherited,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Trace {
    pub tick: u64,
    pub title: String,
    pub detail: String,
    pub pos: Option<Pos>,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub enum Command {
    Move(Direction),
    Interact,
    Build(StructureKind),
    Wait(u32),
    ReturnToMarker,
    Explore(Pos),
    UseAt(Pos),
    Place(StructureKind, Pos),
    Dismantle(Pos),
    Deposit(Pos),
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct World {
    pub version: u32,
    pub base_version: String,
    pub seed: u64,
    pub tick: u64,
    pub player: Pos,
    pub facing: Direction,
    pub inventory: Inventory,
    pub commons: Inventory,
    pub traffic: BTreeMap<Pos, Usage>,
    pub resources: Vec<ResourceSite>,
    pub residents: Vec<Resident>,
    pub structures: Vec<Structure>,
    pub assembly: bool,
    pub founding_choice: Option<StructureKind>,
    pub traces: Vec<Trace>,
    pub deltas: Vec<Command>,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub enum Outcome {
    Changed(String),
    Blocked(String),
    Refused(String),
    Observed(String),
}

impl Outcome {
    #[must_use]
    pub fn message(&self) -> &str {
        match self {
            Self::Changed(message)
            | Self::Blocked(message)
            | Self::Refused(message)
            | Self::Observed(message) => message,
        }
    }
}
