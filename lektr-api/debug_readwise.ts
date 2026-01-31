
import { ReadwiseImporter } from "./src/importers/readwise";

const sampleCSV = `Highlight,Book Title,Book Author,Amazon Book ID,Note,Color,Tags,Location Type,Location,Highlighted at,Document tags
“No dumb bastard ever won a war by going out and dying for his country. He won it by making some other dumb bastard die for his country.”,This Inevitable Ruin,Matt Dinniman,,,,,page,2,2026-01-27 05:56:46+00:00,
"“What the fuck does my skin have to do with anything? Are you some sort of pervert? And we agreed to a trade, so get talking.”",This Inevitable Ruin,Matt Dinniman,,,,,page,3,2026-01-27 10:22:26+00:00,
"The young nullian rolled her eyes. “I told you, Quasar. I have a report due on perceptions of the crawl, and I’m interviewing people, having them give me recaps, and I was assigned Carl and Donut.",This Inevitable Ruin,Matt Dinniman,,,,,page,4,2026-01-27 10:25:15+00:00,
"biscuit holes flapping. I am very busy, and my time is valuable. You want information, you should learn to trade for it. It’s good for you.”
“But",This Inevitable Ruin,Matt Dinniman,,,,,page,5,2026-01-27 10:27:04+00:00,
Some quote 2,This Inevitable Ruin,Matt Dinniman,,**test** quote,,,page,22,2026-01-27 17:26:16+00:00,
"Nicholas Carr, in his aptly titled 2010 book, The Shallows: What the Internet Is Doing to Our Brains, lamented his lost ability to stay on one path. Life on the internet changed how his brain sought out information, even when he was off-line trying to read a book. It reduced his ability to focus and reflect because he now craved a constant stream of stimulation: “Once I was a scuba diver in the sea of words. Now I zip along the surface like a guy on a Jet Ski.”",The Anxious Generation How the Great Rewiring of Childhood is Causing an Epidemic of Mental Illness,Jonathan Haidt,,,,,page,127,2025-03-20 20:01:08+00:00,
`;

async function run() {
  const importer = new ReadwiseImporter();
  const file = new File([sampleCSV], "readwise.csv", { type: "text/csv" });

  console.log("Validating...");
  const isValid = await importer.validate(file);
  console.log("IsValid:", isValid);

  if (!isValid) {
    console.error("Validation failed");
    return;
  }

  console.log("Parsing...");
  try {
    const result = await importer.parse(file);
    console.log("Parsed result:", JSON.stringify(result, null, 2));
  } catch (e) {
    console.error("Parse error:", e);
  }
}

run();
