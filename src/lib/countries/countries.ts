/**
 * v2.9.20 GÖREV 4 — Ülke bazlı lig sistemi (SADECE 10 BAŞLICA LİG).
 *
 * 10 ülke × 4 tier = 40 lig (her ülkede 4 kademe piramidi).
 * Her ülke için kurgusal takım ismi havuzu (18 takım × 4 tier = 72 isim).
 *
 * Başlıca ligler (FIFA sıralaması + futbol kültürü referansı):
 *   1. TR — Türkiye (Süper Lig)
 *   2. GB — İngiltere (Premier Lig)
 *   3. ES — İspanya (La Liga)
 *   4. IT — İtalya (Serie A)
 *   5. DE — Almanya (Bundesliga)
 *   6. FR — Fransa (Ligue 1)
 *   7. PT — Portekiz (Primeira Liga)
 *   8. NL — Hollanda (Eredivisie)
 *   9. BR — Brezilya (Série A)
 *   10. AR — Arjantin (Primera División)
 *
 * Diğer ülkeler: yok. Kullanıcı bu 10 ligten birini seçer.
 */

export type Country = {
  /** ISO 3166-1 alpha-2 kodu */
  code: string;
  /** Türkçe isim */
  name_tr: string;
  /** İngilizce isim */
  name_en: string;
  /** Bayrak emoji */
  flag_emoji: string;
  /** Para birimi simgesi */
  currency: string;
  /** Takım ismi şablonu */
  name_template: "city_spor" | "city_fc" | "city_united" | "city_sc" | "city_ac";
  /** Şehir listesi (kurgusal takım isimleri için — 18 adet) */
  cities: string[];
  /** Erkek isim havuzu */
  first_names: string[];
  /** Soyisim havuzu */
  last_names: string[];
};

/**
 * 10 başlıca ülke — kurgusal takım isimleri ve isim havuzları ile.
 */
export const COUNTRIES: Country[] = [
  // ─── Türkiye ────────────────────────────────────────────────────────────
  {
    code: "TR", name_tr: "Türkiye", name_en: "Turkey", flag_emoji: "🇹🇷", currency: "₺",
    name_template: "city_spor",
    cities: ["İstanbul", "Ankara", "İzmir", "Bursa", "Antalya", "Adana", "Konya", "Gaziantep",
      "Kayseri", "Şanlıurfa", "Mersin", "Diyarbakır", "Samsun", "Denizli", "Sakarya", "Eskişehir",
      "Trabzon", "Malatya"],
    first_names: ["Ahmet", "Mehmet", "Mustafa", "Ali", "Hüseyin", "Hasan", "Murat", "Emre",
      "Burak", "Okan", "Kerem", "Deniz", "Eren", "Yusuf", "Ozan", "Berkay", "Sinan", "Yiğit"],
    last_names: ["Yılmaz", "Kaya", "Demir", "Şahin", "Çelik", "Yıldız", "Yıldırım", "Öztürk",
      "Aydın", "Özdemir", "Arslan", "Doğan", "Kılıç", "Aslan", "Çetin", "Kara", "Koç", "Kurt"],
  },
  // ─── İngiltere ──────────────────────────────────────────────────────────
  {
    code: "GB", name_tr: "İngiltere", name_en: "England", flag_emoji: "🏴", currency: "£",
    name_template: "city_united",
    cities: ["London", "Manchester", "Liverpool", "Birmingham", "Leeds", "Sheffield", "Bristol",
      "Newcastle", "Nottingham", "Leicester", "Coventry", "Bradford", "Stoke", "Wolverhampton",
      "Plymouth", "Southampton", "Reading", "Derby"],
    first_names: ["James", "Oliver", "Jack", "Harry", "Jacob", "Charlie", "Thomas", "George",
      "Oscar", "William", "Daniel", "Michael", "Edward", "Joshua", "Samuel", "Joseph", "David", "Henry"],
    last_names: ["Smith", "Jones", "Williams", "Taylor", "Brown", "Davies", "Evans", "Wilson",
      "Thomas", "Roberts", "Johnson", "Lewis", "Walker", "Robinson", "Wood", "Thompson", "White", "Watson"],
  },
  // ─── İspanya ────────────────────────────────────────────────────────────
  {
    code: "ES", name_tr: "İspanya", name_en: "Spain", flag_emoji: "🇪🇸", currency: "€",
    name_template: "city_fc",
    cities: ["Madrid", "Barcelona", "Valencia", "Sevilla", "Zaragoza", "Málaga", "Murcia",
      "Palma", "Bilbao", "Alicante", "Córdoba", "Valladolid", "Vigo", "Gijón", "Granada", "Vitoria",
      "Elche", "Oviedo"],
    first_names: ["Hugo", "Martín", "Daniel", "Pablo", "Mateo", "Alejandro", "Lucas", "Álvaro",
      "Adrián", "David", "Mario", "Diego", "Marco", "Iker", "Sergio", "Carlos", "Javier", "Iván"],
    last_names: ["García", "Fernández", "González", "Rodríguez", "López", "Martínez", "Sánchez",
      "Pérez", "Gómez", "Martín", "Jiménez", "Ruiz", "Hernández", "Díaz", "Moreno", "Muñoz", "Álvarez", "Romero"],
  },
  // ─── İtalya ─────────────────────────────────────────────────────────────
  {
    code: "IT", name_tr: "İtalya", name_en: "Italy", flag_emoji: "🇮🇹", currency: "€",
    name_template: "city_fc",
    cities: ["Roma", "Milano", "Napoli", "Torino", "Palermo", "Genova", "Bologna", "Firenze",
      "Bari", "Catania", "Venezia", "Verona", "Messina", "Padova", "Trieste", "Brescia", "Parma", "Prato"],
    first_names: ["Lorenzo", "Alessandro", "Mattia", "Leonardo", "Francesco", "Gabriele", "Tommaso",
      "Riccardo", "Matteo", "Andrea", "Davide", "Marco", "Giulio", "Antonio", "Federico", "Luca", "Giovanni", "Stefano"],
    last_names: ["Rossi", "Ferrari", "Esposito", "Bianchi", "Romano", "Colombo", "Russo", "Ricci",
      "Marino", "Greco", "Bruno", "Gallo", "Conti", "De Luca", "Mancini", "Costa", "Giordano", "Rizzo"],
  },
  // ─── Almanya ────────────────────────────────────────────────────────────
  {
    code: "DE", name_tr: "Almanya", name_en: "Germany", flag_emoji: "🇩🇪", currency: "€",
    name_template: "city_fc",
    cities: ["Berlin", "München", "Hamburg", "Köln", "Frankfurt", "Stuttgart", "Düsseldorf",
      "Dortmund", "Essen", "Leipzig", "Bremen", "Dresden", "Hannover", "Nürnberg", "Duisburg",
      "Bochum", "Wuppertal", "Bielefeld"],
    first_names: ["Lukas", "Max", "Paul", "Leon", "Felix", "Jonas", "Tim", "Finn",
      "Niklas", "Philipp", "Tom", "Moritz", "Julian", "Tobias", "David", "Florian", "Marco", "Simon"],
    last_names: ["Müller", "Schmidt", "Schneider", "Fischer", "Weber", "Meyer", "Wagner", "Becker",
      "Wolff", "Hoffmann", "Schäfer", "Koch", "Bauer", "Richter", "Klein", "Wolf", "Schröder", "Neumann"],
  },
  // ─── Fransa ─────────────────────────────────────────────────────────────
  {
    code: "FR", name_tr: "Fransa", name_en: "France", flag_emoji: "🇫🇷", currency: "€",
    name_template: "city_fc",
    cities: ["Paris", "Marseille", "Lyon", "Toulouse", "Nice", "Nantes", "Strasbourg",
      "Montpellier", "Bordeaux", "Lille", "Rennes", "Reims", "Le Havre", "Saint-Étienne", "Toulon",
      "Grenoble", "Dijon", "Angers"],
    first_names: ["Lucas", "Hugo", "Léo", "Gabriel", "Louis", "Raphaël", "Arthur", "Jules",
      "Nathan", "Tom", "Noah", "Liam", "Ethan", "Théo", "Sacha", "Maël", "Gabin", "Aaron"],
    last_names: ["Martin", "Bernard", "Dubois", "Thomas", "Robert", "Richard", "Petit", "Durand",
      "Leroy", "Moreau", "Simon", "Laurent", "Lefebvre", "Michel", "Garcia", "David", "Bertrand", "Roux"],
  },
  // ─── Portekiz ───────────────────────────────────────────────────────────
  {
    code: "PT", name_tr: "Portekiz", name_en: "Portugal", flag_emoji: "🇵🇹", currency: "€",
    name_template: "city_fc",
    cities: ["Lisboa", "Porto", "Braga", "Coimbra", "Funchal", "Aveiro", "Évora", "Faro",
      "Leiria", "Setúbal", "Viseu", "Viana", "Beja", "Castelo Branco", "Guarda", "Santarém",
      "Portalegre", "Bragança"],
    first_names: ["João", "Tiago", "Rodrigo", "Sérgio", "Rafael", "Miguel", "Bruno", "André",
      "Pedro", "Daniel", "David", "José", "António", "Rui", "Carlos", "Filipe", "Paulo", "Hugo"],
    last_names: ["Silva", "Santos", "Pereira", "Ferreira", "Oliveira", "Rodrigues", "Costa",
      "Martins", "Sousa", "Fernandes", "Gomes", "Lopes", "Marques", "Almeida", "Ribeiro", "Pinto", "Carvalho", "Teixeira"],
  },
  // ─── Hollanda ───────────────────────────────────────────────────────────
  {
    code: "NL", name_tr: "Hollanda", name_en: "Netherlands", flag_emoji: "🇳🇱", currency: "€",
    name_template: "city_fc",
    cities: ["Amsterdam", "Rotterdam", "Den Haag", "Utrecht", "Eindhoven", "Tilburg", "Groningen",
      "Almere", "Breda", "Nijmegen", "Enschede", "Apeldoorn", "Haarlem", "Arnhem", "Amersfoort",
      "Zaanstad", "'s-Hertogenbosch", "Haarlemmermeer"],
    first_names: ["Daan", "Sem", "Lucas", "Levi", "Finn", "Bram", "Thijs", "Sven",
      "Luuk", "Jesse", "Tim", "Tijn", "Niels", "Ruben", "Jasper", "Stijn", "Joep", "Mees"],
    last_names: ["De Jong", "Jansen", "De Vries", "Van den Berg", "Van Dijk", "Bakker", "Janssen",
      "Visser", "Smit", "Meijer", "De Boer", "Mulder", "De Groot", "Bos", "Peters", "Hendriks", "Van Der Linden", "Dekker"],
  },
  // ─── Brezilya ───────────────────────────────────────────────────────────
  {
    code: "BR", name_tr: "Brezilya", name_en: "Brazil", flag_emoji: "🇧🇷", currency: "R$",
    name_template: "city_fc",
    cities: ["São Paulo", "Rio de Janeiro", "Salvador", "Brasília", "Fortaleza", "Belo Horizonte", "Manaus", "Curitiba",
      "Recife", "Porto Alegre", "Belém", "Goiânia", "Guarulhos", "Campinas", "São Luís", "Maceió",
      "Duque de Caxias", "Natal"],
    first_names: ["Miguel", "Arthur", "Gael", "Théo", "Heitor", "Ravi", "Davi", "Bernardo",
      "Noah", "Samuel", "Pedro", "Gabriel", "Lucas", "Benício", "Benjamin", "Matheus", "João", "Cauã"],
    last_names: ["Silva", "Santos", "Souza", "Oliveira", "Pereira", "Lima", "Ferreira", "Almeida",
      "Costa", "Rodrigues", "Carvalho", "Gomes", "Martins", "Araújo", "Barbosa", "Ribeiro", "Alves", "Melo"],
  },
  // ─── Arjantin ───────────────────────────────────────────────────────────
  {
    code: "AR", name_tr: "Arjantin", name_en: "Argentina", flag_emoji: "🇦🇷", currency: "$",
    name_template: "city_fc",
    cities: ["Buenos Aires", "Córdoba", "Rosario", "Mendoza", "San Miguel de Tucumán", "La Plata", "Mar del Plata", "Salta",
      "Santa Fe", "San Juan", "Resistencia", "Neuquén", "Santiago del Estero", "Corrientes", "Posadas", "Bahía Blanca",
      "Paraná", "Formosa"],
    first_names: ["Benicio", "Mateo", "Bautista", "Joaquín", "Valentín", "Thiago", "Lautaro", "Benjamín",
      "Tomás", "Santino", "Juan", "Ignacio", "Bruno", "Martín", "Felipe", "Pedro", "Emir", "Fausto"],
    last_names: ["González", "Rodríguez", "Fernández", "García", "López", "Martínez", "Pérez", "Sánchez",
      "Romero", "Sosa", "Álvarez", "Torres", "Ruiz", "Ramírez", "Flores", "Acosta", "Benítez", "Medina"],
  },
];

/**
 * Ülke koduna göre ülkeyi getir.
 */
export function getCountry(code: string): Country | undefined {
  return COUNTRIES.find((c) => c.code === code.toUpperCase());
}

/**
 * Bir ülke için kurgusal takım isimleri üretir (18 takım).
 * Tier'a göre renk paleti değişir.
 */
export function getCountryClubNames(countryCode: string, tier: number = 4): Array<{
  name: string;
  short: string;
  c1: string;
  c2: string;
}> {
  const country = getCountry(countryCode);
  if (!country) {
    return [];
  }

  // v2.9.37: Tier'a göre farklı isim suffix'leri — aynı şehirler farklı liglerde farklı isimlerle
  const tierSuffixes: Record<number, string[]> = {
    1: ["FC", "United", "City", "Athletic", "Sporting"],  // Süper Lig — prestijli
    2: ["SC", "United", "FC", "SV", "AS"],                 // 2. Lig
    3: ["FK", "SK", "CF", "BK", "VV"],                     // 3. Lig
    4: ["spor", "SK", "İds", "Gençlik", "Belediye"],      // 4. Lig — yerel
  };

  // Tier'a göre renk paletleri
  const tierPalettes: Record<number, Array<[string, string]>> = {
    1: [  // Süper Lig — koyu renkler
      ["#1a3a2a", "#f5f5f0"], ["#1f2937", "#fbbf24"], ["#1e3a8a", "#ffffff"], ["#7c2d12", "#fef3c7"],
      ["#065f46", "#d1fae5"], ["#0e7490", "#cffafe"], ["#4c1d95", "#ede9fe"], ["#92400e", "#fff7ed"],
      ["#14532d", "#bbf7d0"], ["#7f1d1d", "#fee2e2"], ["#0c4a6e", "#e0f2fe"], ["#581c87", "#f3e8ff"],
      ["#134e4a", "#ccfbf1"], ["#854d0e", "#fef9c3"], ["#9f1239", "#ffe4e6"], ["#155e75", "#ecfeff"],
      ["#9a3412", "#fff7ed"], ["#1a3a2a", "#fbbf24"],
    ],
    2: [  // 2. Lig — orta tonlar
      ["#3b82f6", "#ffffff"], ["#10b981", "#ffffff"], ["#f59e0b", "#ffffff"], ["#ef4444", "#ffffff"],
      ["#8b5cf6", "#ffffff"], ["#ec4899", "#ffffff"], ["#06b6d4", "#ffffff"], ["#84cc16", "#ffffff"],
      ["#f97316", "#ffffff"], ["#6366f1", "#ffffff"], ["#14b8a6", "#ffffff"], ["#a855f7", "#ffffff"],
      ["#22c55e", "#ffffff"], ["#eab308", "#ffffff"], ["#312e81", "#ffffff"], ["#7c3aed", "#ffffff"],
      ["#0d9488", "#ffffff"], ["#be185d", "#ffffff"],
    ],
    3: [  // 3. Lig — açık renkler
      ["#93c5fd", "#1e3a8a"], ["#6ee7b7", "#064e3b"], ["#fcd34d", "#78350f"], ["#fca5a5", "#7f1d1d"],
      ["#c4b5fd", "#4c1d95"], ["#f9a8d4", "#831843"], ["#67e8f9", "#0e7490"], ["#bef264", "#365314"],
      ["#fdba74", "#9a3412"], ["#a5b4fc", "#312e81"], ["#5eead4", "#134e4a"], ["#d8b4fe", "#5b21b6"],
      ["#86efac", "#14532d"], ["#fde047", "#713f12"], ["#fda4af", "#9f1239"], ["#7dd3fc", "#075985"],
      ["#fcd34d", "#1e3a8a"], ["#c4b5fd", "#1e1b4b"],
    ],
    4: [  // 4. Lig — minimal palet
      ["#4b5563", "#ffffff"], ["#6b7280", "#ffffff"], ["#9ca3af", "#1f2937"], ["#d1d5db", "#1f2937"],
      ["#374151", "#f3f4f6"], ["#4b5563", "#e5e7eb"], ["#6b7280", "#fbbf24"], ["#9ca3af", "#f59e0b"],
      ["#374151", "#10b981"], ["#4b5563", "#3b82f6"], ["#6b7280", "#ef4444"], ["#9ca3af", "#8b5cf6"],
      ["#374151", "#ec4899"], ["#4b5563", "#06b6d4"], ["#6b7280", "#84cc16"], ["#9ca3af", "#f97316"],
      ["#374151", "#fcd34d"], ["#4b5563", "#fde047"],
    ],
  };

  const palette = tierPalettes[tier] ?? tierPalettes[4];
  const suffixes = tierSuffixes[tier] ?? tierSuffixes[4];

  return country.cities.slice(0, 18).map((city, idx) => {
    const [c1, c2] = palette[idx % palette.length];
    // v2.9.37: Tier'a göre suffix seç — aynı şehir farklı liglerde farklı isim
    const suffix = suffixes[idx % suffixes.length];
    const name = `${city} ${suffix}`;
    return {
      name,
      short: city.slice(0, 3).toUpperCase(),
      c1,
      c2,
    };
  });
}

/**
 * Bir ülke için isim havuzunu getir.
 */
export function getCountryNameHavuzu(countryCode: string): {
  first_names: string[];
  last_names: string[];
} {
  const country = getCountry(countryCode);
  if (!country) {
    return { first_names: [], last_names: [] };
  }
  return {
    first_names: country.first_names,
    last_names: country.last_names,
  };
}

/**
 * Ülke listesini (kod + Türkçe isim + bayrak) getir — UI dropdown için.
 */
export function getCountryList(): Array<{ code: string; name_tr: string; flag_emoji: string }> {
  return COUNTRIES.map((c) => ({
    code: c.code,
    name_tr: c.name_tr,
    flag_emoji: c.flag_emoji,
  }));
}
