/**
 * Converts Indian Rupee amounts into words using standard Indian numbering format (Lakhs, Crores).
 * Example: 1349.50 -> "Indian Rupees One Thousand Three Hundred Forty-Nine and Fifty Paise Only"
 */

const ONES = [
  "",
  "One",
  "Two",
  "Three",
  "Four",
  "Five",
  "Six",
  "Seven",
  "Eight",
  "Nine",
  "Ten",
  "Eleven",
  "Twelve",
  "Thirteen",
  "Fourteen",
  "Fifteen",
  "Sixteen",
  "Seventeen",
  "Eighteen",
  "Nineteen",
];

const TENS = [
  "",
  "",
  "Twenty",
  "Thirty",
  "Forty",
  "Fifty",
  "Sixty",
  "Seventy",
  "Eighty",
  "Ninety",
];

function convertThreeDigits(num: number): string {
  let str = "";
  if (num >= 100) {
    str += ONES[Math.floor(num / 100)] + " Hundred ";
    num %= 100;
  }
  if (num > 0) {
    if (num < 20) {
      str += ONES[num] + " ";
    } else {
      str += TENS[Math.floor(num / 10)];
      if (num % 10 > 0) {
        str += "-" + ONES[num % 10];
      }
      str += " ";
    }
  }
  return str.trim();
}

export function numberToIndianRupeesWords(amount: number): string {
  if (isNaN(amount) || amount === null || amount === undefined) {
    return "Indian Rupees Zero Only";
  }

  const rounded = Math.round((Number(amount) + Number.EPSILON) * 100) / 100;
  const isNegative = rounded < 0;
  const absAmount = Math.abs(rounded);

  const rupees = Math.floor(absAmount);
  const paise = Math.round((absAmount - rupees) * 100);

  if (rupees === 0 && paise === 0) {
    return "Indian Rupees Zero Only";
  }

  let words = "";

  if (rupees > 0) {
    let n = rupees;

    const crores = Math.floor(n / 10000000);
    n %= 10000000;

    const lakhs = Math.floor(n / 100000);
    n %= 100000;

    const thousands = Math.floor(n / 1000);
    n %= 1000;

    const remainder = n;

    if (crores > 0) {
      words += convertThreeDigits(crores) + " Crore ";
    }
    if (lakhs > 0) {
      words += convertThreeDigits(lakhs) + " Lakh ";
    }
    if (thousands > 0) {
      words += convertThreeDigits(thousands) + " Thousand ";
    }
    if (remainder > 0) {
      words += convertThreeDigits(remainder) + " ";
    }
  }

  let result = "Indian Rupees " + (words.trim() || "Zero");

  if (paise > 0) {
    result += " and " + convertThreeDigits(paise) + " Paise";
  }

  result += " Only";

  if (isNegative) {
    result = "Minus " + result;
  }

  return result.replace(/\s+/g, " ").trim();
}
