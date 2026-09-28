import census from "@/data/census.json";

interface CensusFile {
  generatedAt: string | null;
  headline?: string;
  tokens?: number;
  noMarket?: number;
  noMarketShare?: number;
  multiWrapperAssets?: number;
  tenXGapAssets?: number;
  issuers?: { name: string; tokens: number; thinShare: number }[];
}

const C = census as unknown as CensusFile;

export default function Census() {
  if (!C.generatedAt || !C.headline) return null;
  const date = new Date(C.generatedAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  return (
    <section className="block census" aria-labelledby="c-title">
      <h2 id="c-title">Across all tokenised assets on CoinMarketCap</h2>
      <p className="census-headline">{C.headline}</p>
      <ul className="census-facts">
        {C.noMarket !== undefined && (
          <li>
            {C.noMarket.toLocaleString("en-US")} tokens ({C.noMarketShare}%) show no price or no trading at all.
          </li>
        )}
        {C.multiWrapperAssets ? (
          <li>
            {C.multiWrapperAssets} assets have two or more traded tokens. In {C.tenXGapAssets} of them, the busiest token trades at least ten times more than the quietest, so
            which token you pick matters.
          </li>
        ) : null}
      </ul>
      <p className="muted small">
        Measured on {date} from CoinMarketCap&apos;s RWA endpoints, derivative tokens excluded. Method in docs/CENSUS.md.
      </p>
    </section>
  );
}
