/**
 * Structured data (schema.org). Google no lo usa para rankear directamente,
 * pero es lo que habilita los resultados enriquecidos —migas, FAQ desplegable,
 * ficha de aplicación— y esos sí se llevan clics de los diez azules de siempre.
 */

import { SITE_NAME, SITE_URL, absoluteUrl } from "./site";

/** Identificadores estables: permiten enlazar nodos entre páginas con @id. */
export const ID_WEBSITE = `${SITE_URL}/#website`;
export const ID_ORGANIZATION = `${SITE_URL}/#organization`;

interface JsonLdProps {
  /** Uno o varios nodos schema.org. Los nulos se descartan. */
  schema: unknown | unknown[];
}

/**
 * Inserta el bloque JSON-LD. Va como componente de servidor: el HTML tiene que
 * llegar con el script ya escrito, porque los rastreadores no ejecutan el JS
 * que lo insertaría después.
 */
export function JsonLd({ schema }: JsonLdProps) {
  const nodes = (Array.isArray(schema) ? schema : [schema]).filter(Boolean);
  if (nodes.length === 0) return null;
  const payload = nodes.length === 1 ? nodes[0] : nodes;

  return (
    <script
      type="application/ld+json"
      // Escapar "<" evita que un dato con "</script>" corte el bloque.
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(payload).replace(/</g, "\\u003c"),
      }}
    />
  );
}

/* ─────────────────────────── Nodos del sitio ─────────────────────────── */

export function websiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": ID_WEBSITE,
    url: SITE_URL,
    name: SITE_NAME,
    inLanguage: "es",
    publisher: { "@id": ID_ORGANIZATION },
  };
}

export function organizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": ID_ORGANIZATION,
    name: SITE_NAME,
    url: SITE_URL,
  };
}

/**
 * El sitio es una herramienta que se usa en el navegador, no un blog. Declararlo
 * como WebApplication gratuita es lo que describe de verdad lo que hay acá.
 */
export function webApplicationSchema(description: string) {
  return {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: SITE_NAME,
    url: SITE_URL,
    applicationCategory: "MultimediaApplication",
    operatingSystem: "Cualquiera con navegador web",
    browserRequirements: "Requiere JavaScript",
    inLanguage: "es",
    description,
    offers: { "@type": "Offer", price: "0", priceCurrency: "EUR" },
    publisher: { "@id": ID_ORGANIZATION },
  };
}

/* ────────────────────────── Nodos por página ────────────────────────── */

export interface Crumb {
  name: string;
  /** Ruta interna. La última miga puede omitirla: es la página actual. */
  path?: string;
}

export function breadcrumbSchema(crumbs: Crumb[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((crumb, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: crumb.name,
      ...(crumb.path ? { item: absoluteUrl(crumb.path) } : {}),
    })),
  };
}

export interface QA {
  question: string;
  answer: string;
}

export function faqSchema(items: QA[]) {
  if (items.length === 0) return null;
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };
}

export interface HowToStep {
  name: string;
  text: string;
}

export function howToSchema(name: string, description: string, steps: HowToStep[]) {
  return {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name,
    description,
    inLanguage: "es",
    step: steps.map((step, i) => ({
      "@type": "HowToStep",
      position: i + 1,
      name: step.name,
      text: step.text,
    })),
  };
}
