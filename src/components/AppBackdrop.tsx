/**
 * Fundo em gradiente dos estilos de vidro.
 *
 * - Neon Liquid Glass: manchas de luz coloridas que se movem devagar.
 * - Apple Liquid Glass: gradiente suave e parado.
 * - Clássico: nada é exibido.
 *
 * As cores seguem o tema (claro/escuro) e a cor de destaque escolhida;
 * tudo é controlado pelo CSS (styles/experience.css).
 */
export default function AppBackdrop() {
  return (
    <div className="pf-backdrop" aria-hidden="true">
      <span className="pf-blob pf-blob-1" />
      <span className="pf-blob pf-blob-2" />
      <span className="pf-blob pf-blob-3" />
      <span className="pf-blob pf-blob-4" />
      <span className="pf-backdrop-sheen" />
    </div>
  )
}
