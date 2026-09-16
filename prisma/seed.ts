/**
 * Resets the GearUp database and seeds a demo dataset: one account per role,
 * a full category taxonomy, and a gear catalogue spread across providers.
 *
 * Destructive — every existing row is deleted first. Run with `npm run seed`.
 *
 * Images are Unsplash URLs whose subject matter was checked against the gear
 * they are attached to. `images.unsplash.com` must stay in the frontend's
 * `next.config.ts` `remotePatterns` for them to render.
 */
import bcrypt from "bcryptjs";
import { Role } from "../generated/prisma/enums.js";
import { prisma } from "../src/lib/prisma.js";

const DEMO_PASSWORD = "12345678Aa#";
const SALT_ROUNDS = Number(process.env.BCRYPT_SALT_ROUNDS ?? 12);

const photo = (id: string) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=1200&q=80`;

/** Verified to load, and each checked to actually depict its subject. */
const IMG = {
  tentInterior: photo("1504280390367-361c6d9f38f4"),
  tentHillside: photo("1571687949921-1306bfb24b72"),
  campfire: photo("1478131143081-80f7f84ca84d"),
  snowPeak: photo("1533130061792-64b345e4a833"),
  cyclingPeloton: photo("1517649763962-0c623066013b"),
  hikerBackpack: photo("1526772662000-3f88f10405ff"),
  surfing: photo("1502680390469-be75c86b636f"),
  swimmerButterfly: photo("1530549387789-4c1017266635"),
  skateboard: photo("1547447134-cd3f5c716030"),
  cyclingPair: photo("1541625602330-2277a4c46182"),
  runningShoes: photo("1476480862126-209bfaa8edc8"),
  nightMountains: photo("1519681393784-d120267933ba"),
  lakeDock: photo("1508672019048-805c876b67e2"),
  runnersDawn: photo("1552674605-db6ffd4facb5"),
  sprintStart: photo("1461896836934-ffe607ba8211"),
  fitnessAthlete: photo("1434682881908-b43d0467b798"),
  barbell: photo("1517836357463-d25dfeac3438"),
  gymFloor: photo("1571902943202-507ec2618e8f"),
  poolDive: photo("1600965962361-9035dbfd1c50"),
} as const;

const USERS = [
  {
    key: "admin",
    name: "GearUp Admin",
    email: "admin+23247886@example.com",
    phone: "+8801700000001",
    role: Role.ADMIN,
  },
  {
    key: "customer",
    name: "Ayesha Rahman",
    email: "customer+23247886@example.com",
    phone: "+8801700000002",
    role: Role.CUSTOMER,
  },
  {
    key: "customer2",
    name: "Tanvir Hasan",
    email: "customer2+23247886@example.com",
    phone: "+8801700000003",
    role: Role.CUSTOMER,
  },
  {
    key: "provider",
    name: "Summit Outfitters",
    email: "provider+23247886@example.com",
    phone: "+8801700000004",
    role: Role.PROVIDER,
  },
  {
    key: "provider2",
    name: "Riverline Watersports",
    email: "provider2+23247886@example.com",
    phone: "+8801700000005",
    role: Role.PROVIDER,
  },
  {
    key: "provider3",
    name: "Peak & Pedal Co.",
    email: "provider3+23247886@example.com",
    phone: "+8801700000006",
    role: Role.PROVIDER,
  },
] as const;

const CATEGORIES = [
  "Camping & Tents",
  "Hiking & Trekking",
  "Backpacks & Travel",
  "Cycling",
  "Mountain Biking",
  "Climbing & Mountaineering",
  "Winter Sports",
  "Water Sports",
  "Kayaking & Paddling",
  "Swimming",
  "Surfing",
  "Running & Athletics",
  "Strength & Fitness",
  "Skateboarding",
] as const;

type CategoryName = (typeof CATEGORIES)[number];
type ProviderKey = "provider" | "provider2" | "provider3";

type GearSeed = {
  name: string;
  category: CategoryName;
  provider: ProviderKey;
  brand: string;
  description: string;
  pricePerDay: number;
  stock: number;
  isAvailable?: boolean;
  images: string[];
};

const GEAR: GearSeed[] = [
  // Camping & Tents
  {
    name: "Coleman Sundome 4-Person Tent",
    category: "Camping & Tents",
    provider: "provider",
    brand: "Coleman",
    description:
      "Freestanding four-person dome tent with a full rainfly, taped seams, and a vestibule for muddy boots. Packs to 60 x 20 cm and pitches in under ten minutes.",
    pricePerDay: 14.5,
    stock: 8,
    images: [IMG.tentInterior, IMG.tentHillside, IMG.campfire],
  },
  {
    name: "MSR Hubba Hubba NX 2-Person Tent",
    category: "Camping & Tents",
    provider: "provider",
    brand: "MSR",
    description:
      "Ultralight two-person backpacking tent weighing 1.72 kg, with two doors, two vestibules, and a cross-pole design that holds shape in wind.",
    pricePerDay: 22,
    stock: 5,
    images: [IMG.tentHillside, IMG.nightMountains],
  },
  {
    name: "Naturehike Down Sleeping Bag -5°C",
    category: "Camping & Tents",
    provider: "provider",
    brand: "Naturehike",
    description:
      "Mummy-cut goose down bag rated to -5°C comfort, with a draft collar and anti-snag zipper. Compresses into the supplied 20-litre stuff sack.",
    pricePerDay: 9,
    stock: 12,
    images: [IMG.tentInterior],
  },
  {
    name: "Jetboil Flash Cooking System",
    category: "Camping & Tents",
    provider: "provider3",
    brand: "Jetboil",
    description:
      "One-litre integrated canister stove that boils water in roughly 100 seconds. Includes insulating cozy, stabiliser tripod, and fuel canister adapter.",
    pricePerDay: 7.5,
    stock: 10,
    images: [IMG.campfire],
  },
  {
    name: "Helinox Chair One Camp Chair",
    category: "Camping & Tents",
    provider: "provider",
    brand: "Helinox",
    description:
      "Collapsible aluminium camp chair that holds 145 kg and packs down to the size of a water bottle. Ideal for festivals and basecamp evenings.",
    pricePerDay: 5,
    stock: 20,
    images: [IMG.campfire, IMG.tentHillside],
  },

  // Hiking & Trekking
  {
    name: "Black Diamond Trail Trekking Poles",
    category: "Hiking & Trekking",
    provider: "provider",
    brand: "Black Diamond",
    description:
      "Adjustable aluminium trekking poles with FlickLock levers, cork grips, and interchangeable carbide tips for rock, mud, and snow.",
    pricePerDay: 6,
    stock: 15,
    images: [IMG.hikerBackpack],
  },
  {
    name: "Garmin GPSMAP 66i Satellite Navigator",
    category: "Hiking & Trekking",
    provider: "provider3",
    brand: "Garmin",
    description:
      "Handheld GPS with inReach satellite messaging and SOS, preloaded topographic maps, and up to 35 hours of tracking on a single charge.",
    pricePerDay: 18,
    stock: 4,
    images: [IMG.hikerBackpack, IMG.snowPeak],
  },
  {
    name: "Petzl Actik Core Headlamp",
    category: "Hiking & Trekking",
    provider: "provider",
    brand: "Petzl",
    description:
      "450-lumen rechargeable headlamp with red night vision and a reactive beam. Runs on the included core battery or three AAA cells.",
    pricePerDay: 4.5,
    stock: 24,
    images: [IMG.nightMountains],
  },

  // Backpacks & Travel
  {
    name: "Osprey Atmos AG 65 Backpack",
    category: "Backpacks & Travel",
    provider: "provider",
    brand: "Osprey",
    description:
      "Sixty-five litre trekking pack with an Anti-Gravity suspended mesh back panel, adjustable harness, and integrated rain cover for multi-day routes.",
    pricePerDay: 12,
    stock: 9,
    images: [IMG.hikerBackpack, IMG.snowPeak],
  },
  {
    name: "Deuter Speed Lite 24 Daypack",
    category: "Backpacks & Travel",
    provider: "provider3",
    brand: "Deuter",
    description:
      "Stripped-back 24-litre daypack weighing 480 g, with hydration sleeve, trekking pole loops, and a breathable Airstripes back system.",
    pricePerDay: 5.5,
    stock: 18,
    images: [IMG.hikerBackpack],
  },
  {
    name: "Sea to Summit 35L Dry Bag Set",
    category: "Backpacks & Travel",
    provider: "provider2",
    brand: "Sea to Summit",
    description:
      "Set of three roll-top dry bags in 8, 20, and 35 litres. Fully waterproof seams keep sleeping kit and electronics dry on river and coastal trips.",
    pricePerDay: 4,
    stock: 22,
    images: [IMG.lakeDock],
  },

  // Cycling
  {
    name: "Trek Domane AL 3 Road Bike",
    category: "Cycling",
    provider: "provider3",
    brand: "Trek",
    description:
      "Endurance road bike with an alloy frame, carbon fork, and Shimano Sora groupset. Comfortable geometry for long paved days and sportives.",
    pricePerDay: 28,
    stock: 6,
    images: [IMG.cyclingPeloton, IMG.cyclingPair],
  },
  {
    name: "Specialized Sirrus X 3.0 Hybrid",
    category: "Cycling",
    provider: "provider3",
    brand: "Specialized",
    description:
      "Versatile hybrid with hydraulic disc brakes and 38 mm tyres, equally at home on city commutes and light gravel paths.",
    pricePerDay: 19,
    stock: 8,
    images: [IMG.cyclingPair],
  },
  {
    name: "Giro Aether MIPS Helmet",
    category: "Cycling",
    provider: "provider3",
    brand: "Giro",
    description:
      "Road helmet with MIPS Spherical rotational protection, eleven wind-tunnel vents, and a Roc Loc Air fit system. Sizes S through L available.",
    pricePerDay: 6,
    stock: 16,
    images: [IMG.cyclingPeloton],
  },
  {
    name: "Thule EasyFold XT 2-Bike Rack",
    category: "Cycling",
    provider: "provider3",
    brand: "Thule",
    description:
      "Tow-bar mounted rack carrying two bikes up to 30 kg each, with integrated ramp for loading e-bikes and a fold-flat frame for storage.",
    pricePerDay: 16,
    stock: 4,
    images: [IMG.cyclingPair],
  },

  // Mountain Biking
  {
    name: "Giant Talon 3 Mountain Bike",
    category: "Mountain Biking",
    provider: "provider3",
    brand: "Giant",
    description:
      "Hardtail trail bike with 100 mm of front travel, 29-inch wheels, and hydraulic disc brakes. A dependable all-rounder for singletrack and fire roads.",
    pricePerDay: 24,
    stock: 7,
    images: [IMG.cyclingPair, IMG.snowPeak],
  },
  {
    name: "Santa Cruz Hightower Full Suspension",
    category: "Mountain Biking",
    provider: "provider3",
    brand: "Santa Cruz",
    description:
      "Carbon full-suspension trail bike with 145 mm rear travel and a 150 mm fork, built for technical descents and long backcountry loops.",
    pricePerDay: 55,
    stock: 3,
    images: [IMG.cyclingPeloton],
  },
  {
    name: "Fox Racing Proframe Full-Face Helmet",
    category: "Mountain Biking",
    provider: "provider3",
    brand: "Fox Racing",
    description:
      "Lightweight ventilated full-face helmet certified for downhill and enduro use, with a magnetic chin strap and MIPS liner.",
    pricePerDay: 9,
    stock: 10,
    images: [IMG.cyclingPeloton],
  },

  // Climbing & Mountaineering
  {
    name: "Petzl Corax Climbing Harness",
    category: "Climbing & Mountaineering",
    provider: "provider",
    brand: "Petzl",
    description:
      "Fully adjustable harness with two waistbelt buckles and four gear loops, suitable for gym sessions, sport routes, and glacier travel.",
    pricePerDay: 6.5,
    stock: 14,
    images: [IMG.snowPeak],
  },
  {
    name: "Black Diamond 9.9mm Rope 60m",
    category: "Climbing & Mountaineering",
    provider: "provider",
    brand: "Black Diamond",
    description:
      "Sixty-metre dynamic single rope with a durable 9.9 mm diameter, dry treatment, and bicolour middle marking for safe rappels.",
    pricePerDay: 11,
    stock: 6,
    images: [IMG.snowPeak, IMG.nightMountains],
  },
  {
    name: "Grivel G12 Crampons",
    category: "Climbing & Mountaineering",
    provider: "provider",
    brand: "Grivel",
    description:
      "Twelve-point steel mountaineering crampons with anti-balling plates, fitting most B2 and B3 boots via the New-Matic binding.",
    pricePerDay: 8,
    stock: 8,
    images: [IMG.snowPeak],
  },

  // Winter Sports
  {
    name: "Rossignol Experience 82 Ski Set",
    category: "Winter Sports",
    provider: "provider",
    brand: "Rossignol",
    description:
      "All-mountain ski package including skis, bindings, and poles. Available in 156, 164, and 172 cm lengths for piste and light off-piste days.",
    pricePerDay: 26,
    stock: 10,
    isAvailable: false,
    images: [IMG.snowPeak],
  },
  {
    name: "Burton Custom Snowboard 158cm",
    category: "Winter Sports",
    provider: "provider",
    brand: "Burton",
    description:
      "Directional twin camber board that handles park laps and powder equally well. Supplied with Cartel bindings and a padded travel bag.",
    pricePerDay: 24,
    stock: 6,
    isAvailable: false,
    images: [IMG.snowPeak, IMG.nightMountains],
  },

  // Water Sports
  {
    name: "Red Paddle Co 10'6 Inflatable SUP",
    category: "Water Sports",
    provider: "provider2",
    brand: "Red Paddle Co",
    description:
      "Stable all-round inflatable paddleboard with a rigid MSL construction, three-piece paddle, coil leash, pump, and wheeled backpack.",
    pricePerDay: 21,
    stock: 9,
    images: [IMG.lakeDock, IMG.surfing],
  },
  {
    name: "O'Neill Reactor 3/2mm Wetsuit",
    category: "Water Sports",
    provider: "provider2",
    brand: "O'Neill",
    description:
      "Full-length 3/2 mm neoprene wetsuit with flatlock seams and a back zip, comfortable in water from roughly 14°C upward. Sizes S to XL.",
    pricePerDay: 10,
    stock: 16,
    images: [IMG.surfing, IMG.poolDive],
  },
  {
    name: "GoPro HERO12 Black with Dive Housing",
    category: "Water Sports",
    provider: "provider2",
    brand: "GoPro",
    description:
      "Action camera shooting 5.3K60 with HyperSmooth stabilisation, supplied with a 60 m dive housing, floating grip, and two spare batteries.",
    pricePerDay: 17,
    stock: 7,
    images: [IMG.surfing, IMG.swimmerButterfly],
  },

  // Kayaking & Paddling
  {
    name: "Perception Pescador 10 Sit-On Kayak",
    category: "Kayaking & Paddling",
    provider: "provider2",
    brand: "Perception",
    description:
      "Ten-foot sit-on-top kayak with moulded rod holders, a sealed hatch, and adjustable seating. Stable enough for beginners and fishing trips.",
    pricePerDay: 23,
    stock: 8,
    images: [IMG.lakeDock],
  },
  {
    name: "Werner Camano Touring Paddle",
    category: "Kayaking & Paddling",
    provider: "provider2",
    brand: "Werner",
    description:
      "Fibreglass touring paddle with a mid-size dihedral blade, available in 210 to 230 cm, offering a smooth quiet stroke on long flat-water days.",
    pricePerDay: 7,
    stock: 14,
    images: [IMG.lakeDock],
  },
  {
    name: "NRS Chinook Fishing PFD",
    category: "Kayaking & Paddling",
    provider: "provider2",
    brand: "NRS",
    description:
      "Coast Guard approved buoyancy aid with seven pockets, a rod holder loop, and high-back flotation that clears kayak seatbacks.",
    pricePerDay: 5.5,
    stock: 20,
    images: [IMG.lakeDock, IMG.surfing],
  },

  // Swimming
  {
    name: "Arena Powerskin Racing Suit",
    category: "Swimming",
    provider: "provider2",
    brand: "Arena",
    description:
      "Competition-grade compression racing suit with bonded seams and water-repellent fabric, FINA approved for sanctioned meets.",
    pricePerDay: 8,
    stock: 12,
    images: [IMG.swimmerButterfly, IMG.poolDive],
  },
  {
    name: "FORM Smart Swim 2 Goggles",
    category: "Swimming",
    provider: "provider2",
    brand: "FORM",
    description:
      "Goggles with a heads-up display showing split times, stroke rate, and distance in real time, with up to 12 hours of battery per charge.",
    pricePerDay: 12,
    stock: 8,
    images: [IMG.poolDive],
  },
  {
    name: "Finis Freestyle Snorkel & Trainer Set",
    category: "Swimming",
    provider: "provider2",
    brand: "Finis",
    description:
      "Centre-mount snorkel with pull buoy, kickboard, and hand paddles for technique work without breaking stroke rhythm.",
    pricePerDay: 4.5,
    stock: 18,
    images: [IMG.swimmerButterfly],
  },

  // Surfing
  {
    name: "Torq 7'2 Funboard Surfboard",
    category: "Surfing",
    provider: "provider2",
    brand: "Torq",
    description:
      "Forgiving epoxy funboard that paddles easily and suits progressing surfers. Supplied with fins, leash, and a padded day bag.",
    pricePerDay: 18,
    stock: 10,
    images: [IMG.surfing],
  },
  {
    name: "Softech 8'0 Foam Longboard",
    category: "Surfing",
    provider: "provider2",
    brand: "Softech",
    description:
      "Soft-top longboard built for lessons and small summer waves, with a durable slick base and three removable fins.",
    pricePerDay: 15,
    stock: 12,
    images: [IMG.surfing, IMG.lakeDock],
  },

  // Running & Athletics
  {
    name: "Garmin Forerunner 965 Running Watch",
    category: "Running & Athletics",
    provider: "provider3",
    brand: "Garmin",
    description:
      "AMOLED multisport watch with dual-band GPS, training readiness, and full-colour mapping. Up to 23 hours in GPS mode.",
    pricePerDay: 13,
    stock: 9,
    images: [IMG.runnersDawn, IMG.sprintStart],
  },
  {
    name: "Stryd Running Power Meter",
    category: "Running & Athletics",
    provider: "provider3",
    brand: "Stryd",
    description:
      "Footpod power meter measuring running power, cadence, and ground contact time, pairing over Bluetooth and ANT+ with most watches.",
    pricePerDay: 6,
    stock: 12,
    images: [IMG.runningShoes],
  },
  {
    name: "Thule Chariot Cross Running Stroller",
    category: "Running & Athletics",
    provider: "provider3",
    brand: "Thule",
    description:
      "Convertible child carrier with a jogging kit, suspension, and a five-point harness. Converts between stroller, jogger, and bike trailer.",
    pricePerDay: 20,
    stock: 5,
    images: [IMG.runnersDawn],
  },
  {
    name: "Adidas Adizero Starting Blocks",
    category: "Running & Athletics",
    provider: "provider3",
    brand: "Adidas",
    description:
      "Competition sprint starting blocks with a rigid aluminium rail and adjustable foot plates, suited to club meets and training sessions.",
    pricePerDay: 11,
    stock: 6,
    images: [IMG.sprintStart],
  },

  // Strength & Fitness
  {
    name: "Rogue Ohio Olympic Barbell 20kg",
    category: "Strength & Fitness",
    provider: "provider",
    brand: "Rogue",
    description:
      "Twenty-kilogram Olympic bar with a 190k PSI shaft, bronze bushings, and dual knurl marks for both powerlifting and weightlifting.",
    pricePerDay: 9,
    stock: 8,
    images: [IMG.barbell, IMG.gymFloor],
  },
  {
    name: "Bowflex SelectTech 552 Dumbbells",
    category: "Strength & Fitness",
    provider: "provider",
    brand: "Bowflex",
    description:
      "Adjustable dumbbell pair replacing fifteen sets, dialling from 2 to 24 kg each. Ideal for home training without a full rack.",
    pricePerDay: 12,
    stock: 10,
    images: [IMG.fitnessAthlete, IMG.barbell],
  },
  {
    name: "Concept2 RowErg Indoor Rower",
    category: "Strength & Fitness",
    provider: "provider",
    brand: "Concept2",
    description:
      "Air-resistance indoor rower with a PM5 monitor, separating into two parts for storage. The training standard for erg testing.",
    pricePerDay: 27,
    stock: 4,
    images: [IMG.gymFloor],
  },
  {
    name: "TRX PRO4 Suspension Trainer",
    category: "Strength & Fitness",
    provider: "provider",
    brand: "TRX",
    description:
      "Bodyweight suspension trainer with adjustable straps, door and beam anchors, and a mesh carry bag for travel workouts.",
    pricePerDay: 5,
    stock: 20,
    images: [IMG.fitnessAthlete],
  },

  // Skateboarding
  {
    name: "Element Section Complete Skateboard",
    category: "Skateboarding",
    provider: "provider3",
    brand: "Element",
    description:
      "Complete 7.75-inch maple deck with 52 mm wheels and Element trucks, set up and ready to ride for street and park sessions.",
    pricePerDay: 7,
    stock: 14,
    images: [IMG.skateboard],
  },
  {
    name: "Landyachtz Drop Hammer Longboard",
    category: "Skateboarding",
    provider: "provider3",
    brand: "Landyachtz",
    description:
      "Drop-through longboard with a low ride height and 70 mm Hawgs wheels, stable for downhill cruising and long commutes.",
    pricePerDay: 10,
    stock: 9,
    images: [IMG.skateboard],
  },
  {
    name: "Triple Eight Sweatsaver Helmet & Pad Set",
    category: "Skateboarding",
    provider: "provider3",
    brand: "Triple Eight",
    description:
      "Certified skate helmet with knee, elbow, and wrist guards. Sizes XS to XL, sanitised between every rental.",
    pricePerDay: 5,
    stock: 22,
    images: [IMG.skateboard],
  },
];

async function main() {
  console.log("Clearing existing data…");
  // Ordered child-to-parent so foreign keys never block a delete.
  await prisma.review.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.rentalOrder.deleteMany();
  await prisma.gearItem.deleteMany();
  await prisma.category.deleteMany();
  await prisma.user.deleteMany();

  console.log("Seeding users…");
  const password = await bcrypt.hash(DEMO_PASSWORD, SALT_ROUNDS);
  const userIds = new Map<string, string>();
  for (const user of USERS) {
    const created = await prisma.user.create({
      data: {
        name: user.name,
        email: user.email,
        phone: user.phone,
        password,
        role: user.role,
      },
      select: { id: true },
    });
    userIds.set(user.key, created.id);
  }

  console.log("Seeding categories…");
  const categoryIds = new Map<string, string>();
  for (const name of CATEGORIES) {
    const created = await prisma.category.create({
      data: { name },
      select: { id: true },
    });
    categoryIds.set(name, created.id);
  }

  console.log("Seeding gear items…");
  for (const item of GEAR) {
    const categoryId = categoryIds.get(item.category);
    const providerId = userIds.get(item.provider);
    if (!categoryId || !providerId) {
      throw new Error(`Unresolved reference for gear item "${item.name}"`);
    }

    await prisma.gearItem.create({
      data: {
        categoryId,
        providerId,
        name: item.name,
        description: item.description,
        brand: item.brand,
        stock: item.stock,
        isAvailable: item.isAvailable ?? true,
        pricePerDay: item.pricePerDay,
        imageUrl: item.images[0],
        imageUrls: item.images,
      },
    });
  }

  const [users, categories, gear] = await Promise.all([
    prisma.user.count(),
    prisma.category.count(),
    prisma.gearItem.count(),
  ]);

  console.log("\nSeed complete:");
  console.table({ users, categories, gearItems: gear });
  console.log(`\nAll demo accounts use the password: ${DEMO_PASSWORD}`);
  for (const user of USERS) {
    console.log(`  ${user.role.padEnd(8)} ${user.email}`);
  }
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
