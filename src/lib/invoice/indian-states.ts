/**
 * Official Indian GST State and Union Territory Codes
 * Reference: Goods and Services Tax Network (GSTN)
 */

export interface IndianState {
  code: string;
  name: string;
  aliases: string[];
}

export const INDIAN_STATES: Record<string, IndianState> = {
  "01": { code: "01", name: "Jammu and Kashmir", aliases: ["jammu", "kashmir", "j&k", "jk"] },
  "02": { code: "02", name: "Himachal Pradesh", aliases: ["himachal", "hp"] },
  "03": { code: "03", name: "Punjab", aliases: ["punjab", "pb"] },
  "04": { code: "04", name: "Chandigarh", aliases: ["chandigarh", "chd"] },
  "05": { code: "05", name: "Uttarakhand", aliases: ["uttarakhand", "uttaranchal", "uk"] },
  "06": { code: "06", name: "Haryana", aliases: ["haryana", "hr"] },
  "07": { code: "07", name: "Delhi", aliases: ["delhi", "new delhi", "nct", "dl"] },
  "08": { code: "08", name: "Rajasthan", aliases: ["rajasthan", "rj"] },
  "09": { code: "09", name: "Uttar Pradesh", aliases: ["uttar pradesh", "up"] },
  "10": { code: "10", name: "Bihar", aliases: ["bihar", "br"] },
  "11": { code: "11", name: "Sikkim", aliases: ["sikkim", "sk"] },
  "12": { code: "12", name: "Arunachal Pradesh", aliases: ["arunachal pradesh", "arunachal", "ar"] },
  "13": { code: "13", name: "Nagaland", aliases: ["nagaland", "nl"] },
  "14": { code: "14", name: "Manipur", aliases: ["manipur", "mn"] },
  "15": { code: "15", name: "Mizoram", aliases: ["mizoram", "mz"] },
  "16": { code: "16", name: "Tripura", aliases: ["tripura", "tr"] },
  "17": { code: "17", name: "Meghalaya", aliases: ["meghalaya", "ml"] },
  "18": { code: "18", name: "Assam", aliases: ["assam", "as"] },
  "19": { code: "19", name: "West Bengal", aliases: ["west bengal", "bengal", "wb"] },
  "20": { code: "20", name: "Jharkhand", aliases: ["jharkhand", "jh"] },
  "21": { code: "21", name: "Odisha", aliases: ["odisha", "orissa", "or", "od"] },
  "22": { code: "22", name: "Chhattisgarh", aliases: ["chhattisgarh", "chattisgarh", "cg"] },
  "23": { code: "23", name: "Madhya Pradesh", aliases: ["madhya pradesh", "mp"] },
  "24": { code: "24", name: "Gujarat", aliases: ["gujarat", "gj", "surat", "ahmedabad", "vadodara", "rajkot"] },
  "25": { code: "25", name: "Daman and Diu", aliases: ["daman", "diu", "daman and diu"] },
  "26": { code: "26", name: "Dadra and Nagar Haveli", aliases: ["dadra", "nagar haveli", "dnh"] },
  "27": { code: "27", name: "Maharashtra", aliases: ["maharashtra", "mh", "mumbai", "pune", "nagpur", "thane"] },
  "28": { code: "28", name: "Andhra Pradesh (Old)", aliases: ["andhra pradesh old"] },
  "29": { code: "29", name: "Karnataka", aliases: ["karnataka", "ka", "bangalore", "bengaluru", "mysore"] },
  "30": { code: "30", name: "Goa", aliases: ["goa", "ga"] },
  "31": { code: "31", name: "Lakshadweep", aliases: ["lakshadweep", "ld"] },
  "32": { code: "32", name: "Kerala", aliases: ["kerala", "kl", "cochin", "kochi", "trivandrum"] },
  "33": { code: "33", name: "Tamil Nadu", aliases: ["tamil nadu", "tamilnadu", "tn", "chennai", "coimbatore"] },
  "34": { code: "34", name: "Puducherry", aliases: ["puducherry", "pondicherry", "py"] },
  "35": { code: "35", name: "Andaman and Nicobar Islands", aliases: ["andaman", "nicobar", "an"] },
  "36": { code: "36", name: "Telangana", aliases: ["telangana", "ts", "tg", "hyderabad"] },
  "37": { code: "37", name: "Andhra Pradesh", aliases: ["andhra pradesh", "andhra", "ap", "visakhapatnam"] },
  "38": { code: "38", name: "Ladakh", aliases: ["ladakh", "leh"] },
  "97": { code: "97", name: "Other Territory", aliases: ["other territory"] },
};

/**
 * Resolves the Indian State and official 2-digit GST state code.
 * Searches provided state name, city, address line, or pincode.
 */
export function resolveIndianState(
  stateName?: string | null,
  fullAddress?: string | null,
): { name: string; code: string } {
  const normState = (stateName || "").trim().toLowerCase();
  const normAddr = (fullAddress || "").toLowerCase();

  // 1. Direct state lookup
  if (normState) {
    for (const s of Object.values(INDIAN_STATES)) {
      if (s.name.toLowerCase() === normState) {
        return { name: s.name, code: s.code };
      }
      if (s.aliases.some((a) => a === normState || normState.includes(a))) {
        return { name: s.name, code: s.code };
      }
    }
  }

  // 2. Search within full address string
  if (normAddr) {
    // Sort by name length descending so "West Bengal" matches before "Bengal"
    const sorted = Object.values(INDIAN_STATES).sort((a, b) => b.name.length - a.name.length);
    for (const s of sorted) {
      const stateLower = s.name.toLowerCase();
      // Match whole word or exact name
      const regex = new RegExp(`\\b${stateLower}\\b`, "i");
      if (regex.test(normAddr)) {
        return { name: s.name, code: s.code };
      }
      for (const a of s.aliases) {
        if (a.length >= 3 && new RegExp(`\\b${a}\\b`, "i").test(normAddr)) {
          return { name: s.name, code: s.code };
        }
      }
    }
  }

  // Default fallback if undetectable: Seller state (Gujarat 24) or Unknown
  return { name: stateName?.trim() || "Gujarat", code: "24" };
}
