import Link from "next/link";
import { Crumb, JsonLd, breadcrumbSchema } from "@/lib/seo/jsonld";

interface Props {
  /** De la raíz a la página actual. El "Inicio" se agrega solo. */
  trail: Crumb[];
}

/**
 * Migas visibles y su BreadcrumbList en un mismo componente.
 *
 * Van juntas por decisión: Google pide que el structured data describa algo que
 * el usuario efectivamente ve en la página, y tenerlos en archivos distintos es
 * la forma más segura de que uno cambie y el otro se quede mintiendo. Además,
 * en las páginas de acorde y escala son el enlace de vuelta al índice: sin
 * ellas cada una sería un callejón sin salida para el rastreador.
 */
export default function Breadcrumbs({ trail }: Props) {
  const crumbs: Crumb[] = [{ name: "Inicio", path: "/" }, ...trail];

  return (
    <>
      <JsonLd schema={breadcrumbSchema(crumbs)} />
      <nav aria-label="Miga de pan" className="no-print text-xs text-stone-500">
        <ol className="flex flex-wrap items-center gap-1.5">
          {crumbs.map((crumb, i) => {
            const last = i === crumbs.length - 1;
            return (
              <li key={`${crumb.name}-${i}`} className="flex items-center gap-1.5">
                {crumb.path && !last ? (
                  <Link href={crumb.path} className="hover:text-stone-800 hover:underline">
                    {crumb.name}
                  </Link>
                ) : (
                  <span className={last ? "text-stone-700" : undefined} aria-current={last ? "page" : undefined}>
                    {crumb.name}
                  </span>
                )}
                {!last && <span aria-hidden="true">›</span>}
              </li>
            );
          })}
        </ol>
      </nav>
    </>
  );
}
