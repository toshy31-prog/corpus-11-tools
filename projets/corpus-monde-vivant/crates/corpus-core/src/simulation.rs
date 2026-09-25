use std::cmp::Reverse;
use std::collections::{BTreeMap, BinaryHeap};

use crate::model::{
    BASE_VERSION, Command, Direction, Inventory, Outcome, PathState, Pos, Resident, ResourceKind,
    ResourceSite, STATE_VERSION, Structure, StructureKind, Terrain, Trace, Usage, WORLD_HEIGHT,
    WORLD_WIDTH, World,
};

const TRAIL_THRESHOLD: u16 = 3;
const ROAD_THRESHOLD: u16 = 7;
const EXHAUSTION_THRESHOLD: u16 = 400;

fn initial_resources() -> Vec<ResourceSite> {
    [
        ("wood-1", ResourceKind::Wood, 5, 5),
        ("wood-2", ResourceKind::Wood, 6, 7),
        ("wood-3", ResourceKind::Wood, 11, 8),
        ("wood-4", ResourceKind::Wood, 14, 2),
        ("stone-1", ResourceKind::Stone, 8, 5),
        ("stone-2", ResourceKind::Stone, 12, 6),
        ("stone-3", ResourceKind::Stone, 3, 9),
        ("fiber-1", ResourceKind::Fiber, 6, 2),
        ("fiber-2", ResourceKind::Fiber, 4, 8),
        ("fiber-3", ResourceKind::Fiber, 13, 8),
    ]
    .into_iter()
    .map(|(id, kind, x, y)| ResourceSite {
        id: id.to_owned(),
        kind,
        pos: Pos::new(x, y),
        active: true,
        depleted_until: 0,
        pressure: 0,
        exhausted: false,
        harvests: 0,
    })
    .collect()
}

fn initial_residents() -> Vec<Resident> {
    vec![
        resident("ina", "Ina", (13, 5), ResourceKind::Fiber),
        resident("mara", "Mara", (9, 2), ResourceKind::Stone),
        resident("nilo", "Nilo", (12, 8), ResourceKind::Wood),
    ]
}

fn resident(id: &str, name: &str, origin: (i32, i32), need: ResourceKind) -> Resident {
    let (x, y) = origin;
    Resident {
        id: id.to_owned(),
        name: name.to_owned(),
        pos: Pos::new(x, y),
        route: vec![
            Pos::new(x, y),
            Pos::new(x + 1, y),
            Pos::new(x + 1, y + 1),
            Pos::new(x, y + 1),
        ],
        route_cursor: 0,
        need,
        energy: 800,
        relation: 0,
        helped: false,
        displaced: false,
    }
}

impl World {
    #[must_use]
    pub fn new(seed: u64) -> Self {
        let mut traffic = BTreeMap::new();
        traffic.insert(
            Pos::new(4, 5),
            Usage {
                player: 1,
                residents: 0,
            },
        );

        Self {
            version: STATE_VERSION,
            base_version: BASE_VERSION.to_owned(),
            seed,
            tick: 0,
            player: Pos::new(4, 5),
            facing: Direction::Right,
            inventory: Inventory::empty(),
            commons: Inventory::empty(),
            traffic,
            resources: initial_resources(),
            residents: initial_residents(),
            structures: Vec::new(),
            assembly: false,
            founding_choice: None,
            traces: vec![Trace {
                tick: 0,
                title: "Le monde est déjà en mouvement".to_owned(),
                detail:
                    "Les usages futurs laisseront des passages, des dépendances et des absences."
                        .to_owned(),
                pos: None,
            }],
            deltas: Vec::new(),
        }
    }

    pub fn apply(&mut self, command: Command) -> Outcome {
        let outcome = self.apply_unrecorded(&command);
        self.deltas.push(command);
        outcome
    }

    fn apply_unrecorded(&mut self, command: &Command) -> Outcome {
        match command {
            Command::Move(direction) => self.move_player(*direction),
            Command::Interact => self.interact(),
            Command::Build(kind) => self.build(*kind),
            Command::Wait(steps) => {
                self.advance(*steps);
                Outcome::Observed(format!("Le monde continue pendant {steps} cycles."))
            }
            Command::ReturnToMarker => self.return_to_marker(),
            Command::Explore(pos) => self.explore(*pos),
            Command::UseAt(pos) => self.use_at(*pos),
            Command::Place(kind, pos) => self.place(*kind, *pos),
            Command::Dismantle(pos) => self.dismantle(*pos),
            Command::Deposit(pos) => self.deposit(*pos),
        }
    }

    fn explore(&mut self, target: Pos) -> Outcome {
        if self.player.manhattan(target) > 1
            || self.travel_cost(target).is_none()
            || self.structure_blocks(target)
        {
            return Outcome::Blocked("Le passage n’est pas praticable.".to_owned());
        }
        if target != self.player {
            self.player = target;
            self.register_usage(target, true);
        }
        Outcome::Observed(String::new())
    }

    fn use_at(&mut self, pos: Pos) -> Outcome {
        if self.player.manhattan(pos) > 2 {
            return Outcome::Blocked("Approche-toi encore.".to_owned());
        }
        // Resolve the person before advancing time: a conversation is not a chase.
        let result = if let Some(i) = self.residents.iter().position(|r| r.pos == pos) {
            self.interact_with_resident(i)
        } else if let Some(i) = self.resources.iter().position(|r| r.pos == pos) {
            if self.resources[i].active {
                self.harvest(i)
            } else {
                Outcome::Observed(if self.resources[i].exhausted {
                    "Ici, plus rien ne repousse. Il faudrait restaurer ce lieu.".to_owned()
                } else {
                    "Laisse ce lieu se renouveler.".to_owned()
                })
            }
        } else if let Some(i) = self.structures.iter().position(|r| r.pos == pos) {
            self.interact_with_structure(i)
        } else {
            Outcome::Observed("Rien à utiliser ici.".to_owned())
        };
        self.advance(1);
        result
    }

    fn place(&mut self, kind: StructureKind, pos: Pos) -> Outcome {
        if pos == self.player || self.player.manhattan(pos) > 2 {
            return Outcome::Blocked("Choisis un emplacement proche et libre.".to_owned());
        }
        self.build_at(kind, Some(pos), false)
    }

    fn dismantle(&mut self, pos: Pos) -> Outcome {
        if self.player.manhattan(pos) > 2 {
            return Outcome::Blocked("Approche-toi pour démonter.".to_owned());
        }
        let Some(index) = self.structures.iter().position(|s| s.pos == pos) else {
            return Outcome::Blocked("Aucun ouvrage à démonter ici.".to_owned());
        };
        let removed = self.structures.remove(index);
        for (kind, count) in build_cost(removed.kind) {
            self.inventory.add(*kind, count.div_ceil(2));
        }
        self.push_trace(
            format!("{} démonté", removed.kind.label()),
            "Une partie des matières revient. Les usages et le temps écoulé demeurent.".to_owned(),
            Some(pos),
        );
        self.advance(1);
        Outcome::Changed("Ouvrage démonté. Une partie des matières est récupérée.".to_owned())
    }

    fn deposit(&mut self, pos: Pos) -> Outcome {
        if self.player.manhattan(pos) > 2
            || !self.structures.iter().any(|s| {
                s.pos == pos
                    && s.active
                    && matches!(s.kind, StructureKind::Hearth | StructureKind::Store)
            })
        {
            return Outcome::Blocked(
                "Il faut une réserve ou un foyer en état, à portée.".to_owned(),
            );
        }
        self.commons.wood = self.commons.wood.saturating_add(self.inventory.wood);
        self.commons.stone = self.commons.stone.saturating_add(self.inventory.stone);
        self.commons.fiber = self.commons.fiber.saturating_add(self.inventory.fiber);
        self.inventory = Inventory::empty();
        self.advance(1);
        Outcome::Changed("Les matières sont déposées pour les autres.".to_owned())
    }

    #[must_use]
    pub fn replay(seed: u64, deltas: &[Command]) -> Self {
        let mut world = Self::new(seed);
        for command in deltas {
            let _ = world.apply_unrecorded(command);
            world.deltas.push(command.clone());
        }
        world
    }

    #[must_use]
    pub const fn terrain_at(pos: Pos) -> Terrain {
        if pos.x <= 0 || pos.y <= 0 || pos.x >= WORLD_WIDTH - 1 || pos.y >= WORLD_HEIGHT - 1 {
            return Terrain::Cliff;
        }
        if (pos.x >= 2 && pos.x <= 4 && pos.y >= 2 && pos.y <= 3)
            || (pos.x >= 15 && pos.y >= 7 && pos.y <= 9)
        {
            return Terrain::Water;
        }
        if pos.y == 5 || (pos.x == 9 && pos.y >= 2 && pos.y <= 9) {
            return Terrain::Path;
        }
        Terrain::Grass
    }

    #[must_use]
    pub fn path_state(&self, pos: Pos) -> PathState {
        if Self::terrain_at(pos) == Terrain::Path {
            return PathState::Inherited;
        }
        match self.traffic.get(&pos).copied().unwrap_or_default().total() {
            total if total >= ROAD_THRESHOLD => PathState::Road,
            total if total >= TRAIL_THRESHOLD => PathState::Trail,
            _ => PathState::Wild,
        }
    }

    #[must_use]
    pub fn travel_cost(&self, pos: Pos) -> Option<u32> {
        match Self::terrain_at(pos) {
            Terrain::Cliff => None,
            Terrain::Water if !self.has_active_bridge(pos) => None,
            Terrain::Water | Terrain::Path => Some(1),
            Terrain::Grass => Some(match self.path_state(pos) {
                PathState::Road | PathState::Inherited => 1,
                PathState::Trail => 2,
                PathState::Wild => 3,
            }),
        }
    }

    #[must_use]
    pub fn signature(&self) -> String {
        let traffic = self
            .traffic
            .iter()
            .filter(|(_, usage)| usage.total() >= TRAIL_THRESHOLD)
            .map(|(pos, usage)| format!("{}:{}={}", pos.x, pos.y, usage.total()))
            .collect::<Vec<_>>()
            .join(",");
        let resources = self
            .resources
            .iter()
            .map(|site| format!("{}:{}:{}", site.id, site.pressure, site.exhausted))
            .collect::<Vec<_>>()
            .join(",");
        let residents = self
            .residents
            .iter()
            .map(|resident| {
                format!(
                    "{}:{}:{}:{}",
                    resident.id, resident.pos.x, resident.pos.y, resident.displaced
                )
            })
            .collect::<Vec<_>>()
            .join(",");
        format!(
            "t={};p={},{};paths={traffic};resources={resources};residents={residents};assembly={};structures={}",
            self.tick,
            self.player.x,
            self.player.y,
            self.assembly,
            self.structures
                .iter()
                .map(|structure| format!("{}:{}", structure.kind.code(), structure.active))
                .collect::<Vec<_>>()
                .join(",")
        )
    }

    fn move_player(&mut self, direction: Direction) -> Outcome {
        let (dx, dy) = direction.delta();
        let target = Pos::new(self.player.x + dx, self.player.y + dy);
        let Some(cost) = self.travel_cost(target) else {
            self.advance(1);
            return Outcome::Blocked("Le passage résiste.".to_owned());
        };
        if self.structure_blocks(target) {
            self.advance(1);
            return Outcome::Blocked("Une construction occupe le passage.".to_owned());
        }
        self.advance(cost);
        self.player = target;
        self.facing = direction;
        self.register_usage(target, true);
        Outcome::Changed(format!("Déplacement en {cost} cycle(s)."))
    }

    fn interact(&mut self) -> Outcome {
        self.advance(1);

        if let Some(index) = self
            .residents
            .iter()
            .position(|resident| resident.pos.manhattan(self.player) <= 1)
        {
            return self.interact_with_resident(index);
        }

        if let Some(index) = self
            .resources
            .iter()
            .position(|site| site.active && site.pos.manhattan(self.player) <= 1)
        {
            return self.harvest(index);
        }

        if let Some(index) = self
            .structures
            .iter()
            .position(|structure| structure.pos.manhattan(self.player) <= 1)
        {
            return self.interact_with_structure(index);
        }

        Outcome::Observed("Rien ne répond à portée.".to_owned())
    }

    fn interact_with_resident(&mut self, index: usize) -> Outcome {
        let need = self.residents[index].need;
        let name = self.residents[index].name.clone();
        if self.residents[index].helped {
            self.residents[index].relation =
                self.residents[index].relation.saturating_add(1).min(5);
        } else {
            if !self.inventory.take(need, 1) {
                return Outcome::Observed(format!(
                    "{name} cherche encore une unité de {}.",
                    need.label()
                ));
            }
            self.residents[index].helped = true;
            self.residents[index].relation = 1;
            self.push_trace(
                format!("{name} reprend une activité"),
                format!(
                    "La relation repose désormais sur une circulation de {}.",
                    need.label()
                ),
                Some(self.residents[index].pos),
            );
        }
        self.maybe_form_assembly();
        let reply = match self.residents[index].id.as_str() {
            "ina" => {
                "Avec ces fibres, je peux réparer les paniers. Un foyer me permettrait de reprendre des forces en chemin."
            }
            "mara" => {
                "Je vais pouvoir laisser des repères. Pose une balise où tu veux qu’on puisse se retrouver."
            }
            _ => {
                "Ça va tenir. Un atelier me permettrait de fabriquer des outils, mais les arbres auraient moins de répit."
            }
        };
        Outcome::Changed(format!("{name} : « {reply} »"))
    }

    fn harvest(&mut self, index: usize) -> Outcome {
        let workshop = self.has_active_structure(StructureKind::Workshop);
        let multiplier = if workshop { 2 } else { 1 };
        let pressure = if workshop {
            if self.founding_choice == Some(StructureKind::Workshop) {
                180
            } else {
                150
            }
        } else {
            70
        };
        let site = &mut self.resources[index];
        site.active = false;
        site.harvests = site.harvests.saturating_add(1);
        site.pressure = site.pressure.saturating_add(pressure);
        site.exhausted = site.pressure >= EXHAUSTION_THRESHOLD;
        site.depleted_until = self.tick + 18 + u64::from(site.pressure / 20);
        let kind = site.kind;
        let pos = site.pos;
        let exhausted = site.exhausted;
        self.inventory.add(kind, multiplier);
        if exhausted {
            self.push_trace(
                "Un site ne revient plus".to_owned(),
                format!(
                    "Les prélèvements de {} ont franchi un seuil local.",
                    kind.label()
                ),
                Some(pos),
            );
        }
        Outcome::Changed(format!("{multiplier} {} prélevé(s).", kind.label()))
    }

    fn interact_with_structure(&mut self, index: usize) -> Outcome {
        let kind = self.structures[index].kind;
        if self.structures[index].condition < 50 {
            if !self.inventory.take(ResourceKind::Wood, 1) {
                return Outcome::Observed(format!(
                    "La {} décline ; une unité de bois permettrait de la réparer.",
                    kind.label()
                ));
            }
            self.structures[index].condition =
                self.structures[index].condition.saturating_add(50).min(100);
            self.structures[index].active = true;
            self.push_trace(
                format!("La {} est réparée", kind.label()),
                "Une capacité revient, mais le coût de son entretien demeure.".to_owned(),
                Some(self.structures[index].pos),
            );
            return Outcome::Changed(format!("La {} fonctionne de nouveau.", kind.label()));
        }

        if matches!(kind, StructureKind::Hearth | StructureKind::Store) {
            let total = self.commons.wood + self.commons.stone + self.commons.fiber;
            if total == 0 {
                return Outcome::Observed("Le dépôt commun est vide.".to_owned());
            }
            self.inventory.wood = self.inventory.wood.saturating_add(self.commons.wood);
            self.inventory.stone = self.inventory.stone.saturating_add(self.commons.stone);
            self.inventory.fiber = self.inventory.fiber.saturating_add(self.commons.fiber);
            self.commons = Inventory::empty();
            return Outcome::Changed(format!("{total} matière(s) quittent le dépôt commun."));
        }

        Outcome::Observed(format!(
            "La {} est active, condition {} sur 100.",
            kind.label(),
            self.structures[index].condition
        ))
    }

    fn build(&mut self, kind: StructureKind) -> Outcome {
        self.build_at(kind, None, true)
    }

    fn build_at(&mut self, kind: StructureKind, location: Option<Pos>, unique: bool) -> Outcome {
        self.advance(1);
        if unique
            && kind != StructureKind::Bridge
            && self
                .structures
                .iter()
                .any(|structure| structure.kind == kind)
        {
            return Outcome::Blocked(format!("Une {} existe déjà.", kind.label()));
        }
        if kind == StructureKind::Recovery && !self.assembly {
            return Outcome::Blocked(
                "Aucune assemblée ne peut encore porter cette aire de reprise.".to_owned(),
            );
        }
        let total_pressure: u32 = self
            .resources
            .iter()
            .map(|site| u32::from(site.pressure))
            .sum();
        if kind == StructureKind::Workshop
            && self.assembly
            && total_pressure >= 300
            && !self.has_active_structure(StructureKind::Recovery)
        {
            return Outcome::Refused(
                "L’assemblée refuse un nouvel atelier tant que les sites marqués ne disposent d’aucune reprise."
                    .to_owned(),
            );
        }

        let Some(location) = location.or_else(|| self.build_location(kind)) else {
            return Outcome::Blocked("Aucun emplacement compatible à portée.".to_owned());
        };
        if !self.location_compatible(kind, location) {
            return Outcome::Blocked(
                "L’emplacement est occupé ou le terrain incompatible.".to_owned(),
            );
        }
        let cost = build_cost(kind);
        if !self.inventory.pay(cost) {
            return Outcome::Blocked("Les matières disponibles ne suffisent pas.".to_owned());
        }
        let id = (self.deltas.len() as u64).max(
            self.structures
                .iter()
                .map(|structure| structure.id)
                .max()
                .unwrap_or(0),
        ) + 1;
        self.structures.push(Structure {
            id,
            kind,
            pos: location,
            condition: 100,
            active: true,
        });
        if self.founding_choice.is_none()
            && matches!(
                kind,
                StructureKind::Marker | StructureKind::Hearth | StructureKind::Workshop
            )
        {
            self.founding_choice = Some(kind);
        }
        self.push_trace(
            format!("Une {} apparaît", kind.label()),
            "Elle ouvre une capacité qui devra désormais être entretenue.".to_owned(),
            Some(location),
        );
        self.maybe_form_assembly();
        Outcome::Changed(format!("{} construite.", kind.label()))
    }

    fn return_to_marker(&mut self) -> Outcome {
        self.advance(1);
        let marker = self
            .structures
            .iter()
            .find(|structure| structure.kind == StructureKind::Marker && structure.active);
        let Some(marker) = marker else {
            return Outcome::Blocked("Aucune balise active ne permet ce retour.".to_owned());
        };
        self.player = marker.pos;
        Outcome::Changed("Retour à la balise.".to_owned())
    }

    fn advance(&mut self, steps: u32) {
        for _ in 0..steps {
            self.tick = self.tick.saturating_add(1);
            self.update_resources();
            self.update_residents();
            if self.tick.is_multiple_of(12) {
                self.update_commons();
                self.apply_recovery();
            }
            if self.tick.is_multiple_of(60) {
                self.update_maintenance();
            }
            self.update_displacements();
            self.maybe_form_assembly();
        }
    }

    fn update_resources(&mut self) {
        for site in &mut self.resources {
            if !site.active && !site.exhausted && self.tick >= site.depleted_until {
                site.active = true;
            }
        }
    }

    fn update_residents(&mut self) {
        let hearth = self.active_structure_position(StructureKind::Hearth);
        let shelters: Vec<Pos> = self
            .structures
            .iter()
            .filter(|s| s.kind == StructureKind::Shelter && s.active)
            .map(|s| s.pos)
            .collect();
        for resident in &mut self.residents {
            resident.energy = resident.energy.saturating_sub(4);
            if hearth.is_some_and(|pos| resident.pos.manhattan(pos) <= 1) {
                resident.energy = resident.energy.saturating_add(75).min(1_000);
            }
            if shelters.iter().any(|pos| resident.pos.manhattan(*pos) <= 1) {
                resident.energy = resident.energy.saturating_add(45).min(1_000);
            }
        }
        if !self.tick.is_multiple_of(3) {
            return;
        }

        for index in 0..self.residents.len() {
            let (current, target) = {
                let resident = &self.residents[index];
                let goals = self.resident_goals(resident);
                let mut cursor = resident.route_cursor % goals.len();
                if resident.pos == goals[cursor] {
                    cursor = (cursor + 1) % goals.len();
                }
                (resident.pos, (goals[cursor], cursor))
            };
            if let Some(next) = self.next_step_towards(current, target.0) {
                self.residents[index].pos = next;
                self.residents[index].route_cursor = target.1;
                self.register_usage(next, false);
            }
        }
    }

    fn update_commons(&mut self) {
        for resident in &mut self.residents {
            if resident.helped && !resident.displaced && resident.energy > 100 {
                let current = self.commons.get(resident.need);
                if current < 6 {
                    self.commons.add(resident.need, 1);
                    resident.energy = resident.energy.saturating_sub(20);
                }
            }
        }
    }

    fn apply_recovery(&mut self) {
        if !self.has_active_structure(StructureKind::Recovery) {
            return;
        }
        let mut recovered = Vec::new();
        for site in &mut self.resources {
            if site.kind == ResourceKind::Stone || site.pressure == 0 {
                continue;
            }
            site.pressure = site.pressure.saturating_sub(30);
            if site.exhausted && site.pressure <= 200 {
                site.exhausted = false;
                site.depleted_until = self.tick + 12;
                recovered.push((site.kind, site.pos));
            }
        }
        for (kind, pos) in recovered {
            self.push_trace(
                "Un site redevient praticable".to_owned(),
                format!(
                    "L’entretien collectif permet au {} de reprendre lentement.",
                    kind.label()
                ),
                Some(pos),
            );
        }
    }

    fn update_maintenance(&mut self) {
        let maintainers: Vec<(StructureKind, bool)> = [
            (StructureKind::Marker, "mara"),
            (StructureKind::Hearth, "ina"),
            (StructureKind::Workshop, "nilo"),
        ]
        .into_iter()
        .map(|(kind, id)| {
            let available = self.residents.iter().any(|resident| {
                resident.id == id && resident.helped && !resident.displaced && resident.energy > 100
            });
            (kind, available)
        })
        .collect();

        let mut failed = Vec::new();
        for structure in &mut self.structures {
            let was_active = structure.active;
            structure.condition = structure.condition.saturating_sub(6);
            let maintained = maintainers
                .iter()
                .find(|(kind, _)| *kind == structure.kind)
                .is_some_and(|(_, available)| *available)
                || (structure.kind == StructureKind::Recovery && self.assembly);
            if maintained {
                structure.condition = structure.condition.saturating_add(9).min(100);
            }
            structure.active = structure.condition > 0;
            if was_active && !structure.active {
                failed.push((structure.kind, structure.pos));
            }
        }
        for (kind, pos) in failed {
            self.push_trace(
                format!("La {} ne fonctionne plus", kind.label()),
                "La construction demeure, mais sa capacité a disparu faute d’entretien.".to_owned(),
                Some(pos),
            );
        }
    }

    fn update_displacements(&mut self) {
        let statuses: Vec<bool> = self
            .residents
            .iter()
            .map(|resident| {
                let relevant: Vec<&ResourceSite> = self
                    .resources
                    .iter()
                    .filter(|site| site.kind == resident.need)
                    .collect();
                !relevant.is_empty() && relevant.iter().all(|site| site.exhausted)
            })
            .collect();
        let mut changes = Vec::new();
        for (resident, displaced) in self.residents.iter_mut().zip(statuses) {
            if resident.displaced != displaced {
                resident.displaced = displaced;
                changes.push((resident.name.clone(), displaced, resident.pos));
            }
        }
        for (name, displaced, pos) in changes {
            self.push_trace(
                if displaced { format!("{name} déplace son activité") } else { format!("{name} revient") },
                if displaced {
                    "La matière nécessaire n’est plus disponible dans ce monde local.".to_owned()
                } else {
                    "Une possibilité matérielle a été rouverte, sans effacer le déplacement précédent.".to_owned()
                },
                Some(pos),
            );
        }
    }

    fn maybe_form_assembly(&mut self) {
        if self.assembly || !self.has_active_structure(StructureKind::Hearth) {
            return;
        }
        let helped = self
            .residents
            .iter()
            .filter(|resident| resident.helped)
            .count();
        let relations: u16 = self
            .residents
            .iter()
            .map(|resident| u16::from(resident.relation))
            .sum();
        if helped >= 2 && relations >= 3 {
            self.assembly = true;
            self.push_trace(
                "Une assemblée se réunit".to_owned(),
                "Les relations entretenues produisent désormais une capacité de proposition et de refus.".to_owned(),
                self.active_structure_position(StructureKind::Hearth),
            );
        }
    }

    fn register_usage(&mut self, pos: Pos, player: bool) {
        let before = self.path_state(pos);
        let usage = self.traffic.entry(pos).or_default();
        if player {
            usage.player = usage.player.saturating_add(1);
        } else {
            usage.residents = usage.residents.saturating_add(1);
        }
        let after = self.path_state(pos);
        if before != after && matches!(after, PathState::Trail | PathState::Road) {
            self.push_trace(
                if after == PathState::Road {
                    "Le sentier devient une route".to_owned()
                } else {
                    "Un sentier apparaît".to_owned()
                },
                "Le passage répété réduit désormais le coût des déplacements et attire d’autres trajets."
                    .to_owned(),
                Some(pos),
            );
        }
    }

    fn resident_goals(&self, resident: &Resident) -> Vec<Pos> {
        if resident.displaced {
            return vec![Pos::new(WORLD_WIDTH - 2, 1)];
        }
        let mut goals = resident.route.clone();
        if resident.energy < 500
            && let Some(shelter) = self
                .structures
                .iter()
                .filter(|s| s.kind == StructureKind::Shelter && s.active)
                .min_by_key(|s| s.pos.manhattan(resident.pos))
        {
            if resident.energy < 200 {
                return vec![shelter.pos];
            }
            goals.push(shelter.pos);
        }
        let linked = match resident.id.as_str() {
            "ina" => StructureKind::Hearth,
            "mara" => StructureKind::Marker,
            "nilo" => StructureKind::Workshop,
            _ => return goals,
        };
        if let Some(pos) = self.active_structure_position(linked) {
            goals.push(pos);
        }
        goals
    }

    fn next_step_towards(&self, start: Pos, target: Pos) -> Option<Pos> {
        if start == target {
            return Some(start);
        }
        let mut frontier = BinaryHeap::new();
        let mut cost = BTreeMap::new();
        let mut previous = BTreeMap::new();
        frontier.push((Reverse(0_u32), start));
        cost.insert(start, 0_u32);

        while let Some((Reverse(current_cost), current)) = frontier.pop() {
            if current == target {
                break;
            }
            if current_cost > cost.get(&current).copied().unwrap_or(u32::MAX) {
                continue;
            }
            for next in current.neighbors() {
                let Some(step_cost) = self.travel_cost(next) else {
                    continue;
                };
                if self.structure_blocks(next) && next != target {
                    continue;
                }
                let candidate = current_cost.saturating_add(step_cost);
                if candidate < cost.get(&next).copied().unwrap_or(u32::MAX) {
                    cost.insert(next, candidate);
                    previous.insert(next, current);
                    frontier.push((Reverse(candidate), next));
                }
            }
        }

        if !previous.contains_key(&target) {
            return None;
        }
        let mut cursor = target;
        while let Some(parent) = previous.get(&cursor).copied() {
            if parent == start {
                return Some(cursor);
            }
            cursor = parent;
        }
        None
    }

    fn build_location(&self, kind: StructureKind) -> Option<Pos> {
        let (dx, dy) = self.facing.delta();
        let target = Pos::new(self.player.x + dx, self.player.y + dy);
        self.location_compatible(kind, target).then_some(target)
    }

    fn location_compatible(&self, kind: StructureKind, target: Pos) -> bool {
        let compatible = if kind == StructureKind::Bridge {
            Self::terrain_at(target) == Terrain::Water
        } else {
            matches!(Self::terrain_at(target), Terrain::Grass | Terrain::Path)
        };
        let occupied = self
            .structures
            .iter()
            .any(|structure| structure.pos == target)
            || self.resources.iter().any(|site| site.pos == target)
            || self.residents.iter().any(|resident| resident.pos == target);
        compatible && !occupied
    }

    fn structure_blocks(&self, pos: Pos) -> bool {
        self.structures.iter().any(|structure| {
            structure.pos == pos
                && matches!(
                    structure.kind,
                    StructureKind::Fence | StructureKind::Workshop | StructureKind::Store
                )
        })
    }

    fn has_active_bridge(&self, pos: Pos) -> bool {
        self.structures.iter().any(|structure| {
            structure.kind == StructureKind::Bridge && structure.pos == pos && structure.active
        })
    }

    #[must_use]
    pub fn has_active_structure(&self, kind: StructureKind) -> bool {
        self.structures
            .iter()
            .any(|structure| structure.kind == kind && structure.active)
    }

    fn active_structure_position(&self, kind: StructureKind) -> Option<Pos> {
        self.structures
            .iter()
            .find(|structure| structure.kind == kind && structure.active)
            .map(|structure| structure.pos)
    }

    fn push_trace(&mut self, title: String, detail: String, pos: Option<Pos>) {
        self.traces.push(Trace {
            tick: self.tick,
            title,
            detail,
            pos,
        });
        if self.traces.len() > 200 {
            self.traces.remove(0);
        }
    }
}

#[must_use]
pub const fn build_cost(kind: StructureKind) -> &'static [(ResourceKind, u16)] {
    match kind {
        StructureKind::Marker => &[(ResourceKind::Wood, 1), (ResourceKind::Stone, 1)],
        StructureKind::Hearth => &[(ResourceKind::Wood, 1), (ResourceKind::Fiber, 1)],
        StructureKind::Workshop | StructureKind::Bridge => {
            &[(ResourceKind::Wood, 2), (ResourceKind::Stone, 1)]
        }
        StructureKind::Recovery => &[(ResourceKind::Wood, 1), (ResourceKind::Fiber, 2)],
        StructureKind::Shelter => &[(ResourceKind::Wood, 3), (ResourceKind::Fiber, 2)],
        StructureKind::Fence => &[(ResourceKind::Wood, 1)],
        StructureKind::Store => &[(ResourceKind::Wood, 2)],
    }
}
