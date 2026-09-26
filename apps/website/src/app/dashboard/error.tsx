'use client';
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <section className="dash-panel">
      <h1>Não foi possível abrir esta página.</h1>
      <p>Os dados guardados no navegador não foram apagados.</p>
      <button className="dash-btn" onClick={reset}>
        Tentar novamente
      </button>
    </section>
  );
}
