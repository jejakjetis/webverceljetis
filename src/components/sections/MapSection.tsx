import { ButtonLink } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { SITE, osmEmbedUrl } from "@/lib/site";

// Embed OpenStreetMap via iframe: 0 KB JavaScript di bundle, tanpa API key.
// CSP: frame-src https://www.openstreetmap.org.
export function MapSection() {
  const { lat, lng } = SITE.map;
  return (
    <section id="peta" aria-labelledby="peta-title" className="bg-sand py-20 lg:py-28">
      <Container className="grid gap-10 lg:grid-cols-[1fr_1.4fr] lg:items-center lg:gap-16">
        <div>
          <SectionHeading id="peta-title" eyebrow="Lokasi" title="Peta Wisata" accent>
            <p>Kampung Batik Jetis berada di tengah Kota Sidoarjo dan mudah dijangkau dari pusat kota.</p>
          </SectionHeading>
          <address className="mt-6 not-italic leading-relaxed text-ink/85">
            {SITE.addressLines.map((l) => (
              <span key={l} className="block">
                {l}
              </span>
            ))}
          </address>
          <div className="mt-6">
            <ButtonLink href={SITE.map.googleMapsUrl} variant="outline" external>
              Buka di Google Maps
            </ButtonLink>
          </div>
        </div>
        <div className="overflow-hidden rounded-sm border border-line bg-cream">
          <iframe
            title="Peta lokasi Kampung Batik Jetis, Sidoarjo"
            src={osmEmbedUrl(lat, lng)}
            className="aspect-[4/3] w-full"
            loading="lazy"
            referrerPolicy="strict-origin-when-cross-origin"
          />
          <p className="px-3 py-2 text-xs text-muted">
            Peta ©{" "}
            <a className="underline" href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">
              kontributor OpenStreetMap
            </a>
          </p>
        </div>
      </Container>
    </section>
  );
}
