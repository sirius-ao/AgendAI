import Image from 'next/image';
import { Container } from '@agendai/ui';
export function BlogHero() {
  return (
    <section className="blog-hero">
      <div className="blog-hero-photo">
        <Image
          src="/images/blog/teacher-writing.webp"
          alt="Professora a escrever junto ao seu computador"
          fill
          priority
          sizes="(max-width: 700px) 100vw, 55vw"
        />
      </div>
      <Container>
        <div>
          <p className="eyebrow">Blog</p>
          <h1>
            Ideias, dicas e recursos
            <br />
            para professores que
            <br />
            <span>fazem a diferença.</span>
          </h1>
          <p>
            Conteúdos práticos para planear melhor, ensinar com mais eficácia e aproveitar ao máximo
            o AgendAI no seu dia a dia.
          </p>
        </div>
      </Container>
    </section>
  );
}
