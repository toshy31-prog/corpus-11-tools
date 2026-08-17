import { Finder } from "./finder";

export default function Home() {
  return (
    <main>
      <header className="hero">
        <nav aria-label="Navigation principale">
          <a className="brand" href="#haut" aria-label="Retour en haut">
            <span aria-hidden="true">●</span> Maintenant
          </a>
          <a className="nav-link" href="#sources">Sources</a>
        </nav>

        <div className="hero-content" id="haut">
          <p className="eyebrow">Aide alimentaire · Paris</p>
          <h1>Manger aujourd’hui.</h1>
          <p className="lede">
            Trois options prioritaires, puis les solutions alimentaires
            vérifiées avec horaires, conditions et fermetures — sans compte.
          </p>
          <div className="hero-actions">
            <a
              className="button button-primary"
              href="#trouver"
            >
              Obtenir trois choix <span aria-hidden="true">↓</span>
            </a>
            <a className="button button-secondary" href="tel:115">
              Appeler le 115
            </a>
          </div>
          <p className="microcopy">
            Le 115 est gratuit et accessible 24 h/24, 7 j/7 pour l’urgence
            sociale.
          </p>
        </div>
      </header>

      <Finder />

      <section className="choices" aria-labelledby="choisir">
        <div className="section-heading">
          <p className="eyebrow">Compléter la recherche</p>
          <h2 id="choisir">Si la sélection ne suffit pas.</h2>
        </div>

        <div className="card-grid">
          <article className="card card-dark">
            <span className="card-number">01</span>
            <div>
              <h3>Hors de Paris : couverture nationale vivante</h3>
              <p>
                Soliguide couvre déjà la France. Nous préparons son intégration
                officielle ici pour éviter une copie incomplète ou périmée.
              </p>
            </div>
            <a href="https://soliguide.fr/" target="_blank" rel="noreferrer">
              Chercher maintenant sur Soliguide <span aria-hidden="true">↗</span>
            </a>
          </article>

          <article className="card">
            <span className="card-number">02</span>
            <div>
              <h3>Les distributions recensées par Paris</h3>
              <p>
                Repas chauds, plats à emporter, colis et épiceries solidaires,
                avec leurs conditions d’accès.
              </p>
            </div>
            <a
              href="https://www.paris.fr/pages/distribution-de-repas-123/"
              target="_blank"
              rel="noreferrer"
            >
              Voir la liste officielle <span aria-hidden="true">↗</span>
            </a>
          </article>

          <article className="card">
            <span className="card-number">03</span>
            <div>
              <h3>Être accompagné dans la durée</h3>
              <p>
                Contacter le service social de proximité ou une permanence
                sociale d’accueil de la Ville.
              </p>
            </div>
            <a
              href="https://www.paris.fr/pages/services-sociaux-197"
              target="_blank"
              rel="noreferrer"
            >
              Trouver un service social <span aria-hidden="true">↗</span>
            </a>
          </article>
        </div>
      </section>

      <section className="before" aria-labelledby="avant">
        <div>
          <p className="eyebrow">Avant de partir</p>
          <h2 id="avant">Vérifiez le jour même.</h2>
        </div>
        <div className="before-copy">
          <p>
            Les horaires, les capacités d’accueil et les conditions peuvent
            changer. Appelez la structure quand un numéro est indiqué, ou
            consultez sa fiche actualisée avant de vous déplacer.
          </p>
          <a
            href="https://cdn.paris.fr/paris/2026/06/01/1877_guide-solidarite-ete-2026-v4-gVHA.pdf"
            target="_blank"
            rel="noreferrer"
          >
            Consulter le Guide Solidarité été 2026 <span aria-hidden="true">↗</span>
          </a>
        </div>
      </section>

      <footer id="sources">
        <div>
          <p className="footer-title">Pas de formulaire. Pas de traçage.</p>
          <p>
            Cette page ne collecte ni adresse, ni identité, ni situation
            personnelle. Les recherches se font directement auprès des services
            liés.
          </p>
        </div>
        <div className="source-list">
          <p>Sources vérifiées le 17 août 2026</p>
          <a href="https://www.paris.fr/" target="_blank" rel="noreferrer">
            Ville de Paris
          </a>
          <a href="https://soliguide.fr/" target="_blank" rel="noreferrer">
            Soliguide
          </a>
          <a
            href="https://www.service-public.fr/particuliers/actualites/A17758?lang=fr"
            target="_blank"
            rel="noreferrer"
          >
            Service-Public.fr
          </a>
        </div>
      </footer>
    </main>
  );
}
