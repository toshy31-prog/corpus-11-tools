use std::collections::{BTreeMap, BTreeSet};

use crate::model::{PathState, Pos, ResourceKind, StructureKind, Terrain, World};

#[derive(Clone, Copy, Debug, Eq, Ord, PartialEq, PartialOrd)]
pub enum Layer {
    Terrain,
    Mobility,
    Ecology,
    Actors,
    Institutions,
    Memory,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum EvidenceKind {
    Observed,
    Derived,
    Inferred,
    Procedural,
    PlayerModified,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum Channel {
    Sight,
    Memory,
    System,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ObservationQuery {
    pub pos: Pos,
    pub observer: String,
    pub channel: Channel,
}

impl ObservationQuery {
    #[must_use]
    pub fn player(pos: Pos) -> Self {
        Self {
            pos,
            observer: "player".to_owned(),
            channel: Channel::Sight,
        }
    }
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Candidate {
    pub layer: Layer,
    pub provider: String,
    pub evidence: EvidenceKind,
    pub value: String,
    pub detectable: bool,
    pub note: String,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub enum LayerFinding {
    Settled { value: String, sources: Vec<String> },
    Contested { candidates: Vec<Candidate> },
    Undetected,
}

#[derive(Clone, Debug, Default, Eq, PartialEq)]
pub struct Observation {
    pub layers: BTreeMap<Layer, LayerFinding>,
}

pub trait Provider {
    fn id(&self) -> &'static str;
    fn observe(&self, world: &World, query: &ObservationQuery) -> Vec<Candidate>;
}

#[derive(Default)]
pub struct WorldModel {
    providers: Vec<Box<dyn Provider>>,
}

impl WorldModel {
    #[must_use]
    pub fn standard() -> Self {
        let mut model = Self::default();
        model.register(Box::new(BaseTerrainProvider));
        model.register(Box::new(MobilityProvider));
        model.register(Box::new(EcologyProvider));
        model.register(Box::new(ActorProvider));
        model.register(Box::new(InstitutionProvider));
        model.register(Box::new(MemoryProvider));
        model
    }

    pub fn register(&mut self, provider: Box<dyn Provider>) {
        self.providers.push(provider);
    }

    #[must_use]
    pub fn observe(&self, world: &World, query: &ObservationQuery) -> Observation {
        let mut grouped: BTreeMap<Layer, Vec<Candidate>> = BTreeMap::new();
        for provider in &self.providers {
            for candidate in provider.observe(world, query) {
                grouped.entry(candidate.layer).or_default().push(candidate);
            }
        }

        let layers = grouped
            .into_iter()
            .map(|(layer, candidates)| {
                let detectable: Vec<Candidate> = candidates
                    .into_iter()
                    .filter(|candidate| candidate.detectable)
                    .collect();
                if detectable.is_empty() {
                    return (layer, LayerFinding::Undetected);
                }
                let values: BTreeSet<&str> = detectable
                    .iter()
                    .map(|candidate| candidate.value.as_str())
                    .collect();
                if values.len() > 1 {
                    return (
                        layer,
                        LayerFinding::Contested {
                            candidates: detectable,
                        },
                    );
                }
                let value = detectable[0].value.clone();
                let sources = detectable
                    .iter()
                    .map(|candidate| candidate.provider.clone())
                    .collect();
                (layer, LayerFinding::Settled { value, sources })
            })
            .collect();
        Observation { layers }
    }
}

fn visible(world: &World, query: &ObservationQuery) -> bool {
    match query.channel {
        Channel::System => true,
        Channel::Sight => {
            query.pos.manhattan(world.player) <= 4
                || world
                    .traffic
                    .get(&query.pos)
                    .is_some_and(|usage| usage.player > 0)
        }
        Channel::Memory => {
            world.traffic.contains_key(&query.pos)
                || world
                    .traces
                    .iter()
                    .any(|trace| trace.pos == Some(query.pos))
        }
    }
}

fn candidate(
    layer: Layer,
    provider: &dyn Provider,
    evidence: EvidenceKind,
    value: String,
    detectable: bool,
    note: &str,
) -> Candidate {
    Candidate {
        layer,
        provider: provider.id().to_owned(),
        evidence,
        value,
        detectable,
        note: note.to_owned(),
    }
}

struct BaseTerrainProvider;

impl Provider for BaseTerrainProvider {
    fn id(&self) -> &'static str {
        "base-terrain:1"
    }

    fn observe(&self, world: &World, query: &ObservationQuery) -> Vec<Candidate> {
        let value = match World::terrain_at(query.pos) {
            Terrain::Grass => "herbe",
            Terrain::Path => "chemin hérité",
            Terrain::Water => "eau",
            Terrain::Cliff => "limite",
        };
        vec![candidate(
            Layer::Terrain,
            self,
            EvidenceKind::Observed,
            value.to_owned(),
            visible(world, query),
            "Perception locale du sol.",
        )]
    }
}

struct MobilityProvider;

impl Provider for MobilityProvider {
    fn id(&self) -> &'static str {
        "mobility-from-use:1"
    }

    fn observe(&self, world: &World, query: &ObservationQuery) -> Vec<Candidate> {
        let state = match world.path_state(query.pos) {
            PathState::Wild => "sans passage stabilisé",
            PathState::Trail => "sentier d’usage",
            PathState::Road => "route d’usage",
            PathState::Inherited => "chemin hérité",
        };
        let cost = world.travel_cost(query.pos).map_or_else(
            || "infranchissable".to_owned(),
            |cost| format!("coût {cost}"),
        );
        vec![candidate(
            Layer::Mobility,
            self,
            EvidenceKind::Derived,
            format!("{state}; {cost}"),
            visible(world, query),
            "Calculé depuis le terrain, les constructions et les passages effectifs.",
        )]
    }
}

struct EcologyProvider;

impl Provider for EcologyProvider {
    fn id(&self) -> &'static str {
        "local-ecology:1"
    }

    fn observe(&self, world: &World, query: &ObservationQuery) -> Vec<Candidate> {
        let Some(site) = world.resources.iter().find(|site| site.pos == query.pos) else {
            return vec![candidate(
                Layer::Ecology,
                self,
                EvidenceKind::Observed,
                "aucun site perceptible".to_owned(),
                visible(world, query),
                "L’absence ne porte que sur ce canal et cette case.",
            )];
        };
        let status = if site.exhausted {
            "épuisé"
        } else if site.active {
            "disponible"
        } else {
            "en reprise"
        };
        vec![candidate(
            Layer::Ecology,
            self,
            EvidenceKind::Observed,
            format!("{} {status}; pression {}", site.kind.label(), site.pressure),
            visible(world, query),
            "Le seuil de pression est local au site.",
        )]
    }
}

struct ActorProvider;

impl Provider for ActorProvider {
    fn id(&self) -> &'static str {
        "situated-actors:1"
    }

    fn observe(&self, world: &World, query: &ObservationQuery) -> Vec<Candidate> {
        let mut names: Vec<String> = world
            .residents
            .iter()
            .filter(|resident| resident.pos == query.pos)
            .map(|resident| {
                if resident.displaced {
                    format!("{} (activité déplacée)", resident.name)
                } else {
                    resident.name.clone()
                }
            })
            .collect();
        if world.player == query.pos {
            names.push("toi".to_owned());
        }
        vec![candidate(
            Layer::Actors,
            self,
            EvidenceKind::Observed,
            if names.is_empty() {
                "personne de visible".to_owned()
            } else {
                names.join(", ")
            },
            visible(world, query),
            "Présence observée, pas identité exhaustive du lieu.",
        )]
    }
}

struct InstitutionProvider;

impl Provider for InstitutionProvider {
    fn id(&self) -> &'static str {
        "institutions-in-practice:1"
    }

    fn observe(&self, world: &World, query: &ObservationQuery) -> Vec<Candidate> {
        let mut institutions: Vec<String> = world
            .structures
            .iter()
            .filter(|structure| structure.pos == query.pos)
            .map(|structure| {
                format!(
                    "{} {} (condition {})",
                    structure.kind.label(),
                    if structure.active {
                        "active"
                    } else {
                        "inactive"
                    },
                    structure.condition
                )
            })
            .collect();
        if world.assembly
            && world.structures.iter().any(|structure| {
                structure.kind == StructureKind::Hearth && structure.pos == query.pos
            })
        {
            institutions.push("assemblée capable de refuser".to_owned());
        }
        vec![candidate(
            Layer::Institutions,
            self,
            EvidenceKind::Procedural,
            if institutions.is_empty() {
                "aucune capacité instituée ici".to_owned()
            } else {
                institutions.join("; ")
            },
            visible(world, query),
            "Décrit les capacités actives, pas seulement les objets présents.",
        )]
    }
}

struct MemoryProvider;

impl Provider for MemoryProvider {
    fn id(&self) -> &'static str {
        "world-traces:1"
    }

    fn observe(&self, world: &World, query: &ObservationQuery) -> Vec<Candidate> {
        let traces: Vec<String> = world
            .traces
            .iter()
            .filter(|trace| trace.pos == Some(query.pos))
            .rev()
            .take(3)
            .map(|trace| format!("t{} {}", trace.tick, trace.title))
            .collect();
        vec![candidate(
            Layer::Memory,
            self,
            EvidenceKind::PlayerModified,
            if traces.is_empty() {
                "aucune trace conservée ici".to_owned()
            } else {
                traces.join(" | ")
            },
            query.channel != Channel::Sight || visible(world, query),
            "Mémoire conservée par le monde courant, non histoire totale.",
        )]
    }
}

#[must_use]
pub fn resource_symbol(kind: ResourceKind) -> char {
    match kind {
        ResourceKind::Wood => 'w',
        ResourceKind::Stone => 's',
        ResourceKind::Fiber => 'f',
    }
}
