"""Turn a spoken phrase ("courses 23 euros 50", "twelve euros for lunch")
into an amount, a description and a category guess. Handles Italian, French and English."""

import re
import unicodedata

NUMBER_WORDS = {
    # French
    "zero": 0, "un": 1, "une": 1, "deux": 2, "trois": 3, "quatre": 4, "cinq": 5,
    "six": 6, "sept": 7, "huit": 8, "neuf": 9, "dix": 10, "onze": 11, "douze": 12,
    "treize": 13, "quatorze": 14, "quinze": 15, "seize": 16, "vingt": 20, "vingts": 20,
    "trente": 30, "quarante": 40, "cinquante": 50, "soixante": 60,
    # English
    "one": 1, "two": 2, "three": 3, "four": 4, "five": 5, "seven": 7, "eight": 8,
    "nine": 9, "ten": 10, "eleven": 11, "twelve": 12, "thirteen": 13, "fourteen": 14,
    "fifteen": 15, "sixteen": 16, "seventeen": 17, "eighteen": 18, "nineteen": 19,
    "twenty": 20, "thirty": 30, "forty": 40, "fifty": 50, "sixty": 60, "seventy": 70,
    "eighty": 80, "ninety": 90,
    # Italian
    "uno": 1, "una": 1, "due": 2, "tre": 3, "tré": 3, "quattro": 4, "cinque": 5, "sei": 6,
    "sette": 7, "otto": 8, "nove": 9, "dieci": 10, "undici": 11, "dodici": 12, "tredici": 13,
    "quattordici": 14, "quindici": 15, "sedici": 16, "diciassette": 17, "diciotto": 18,
    "diciannove": 19, "venti": 20, "trenta": 30, "quaranta": 40, "cinquanta": 50,
    "sessanta": 60, "settanta": 70, "ottanta": 80, "novanta": 90,
}
HUNDREDS = {"cent", "hundred", "cento"}
THOUSANDS = {"mille", "thousand", "mila"}
JOINERS = {"et", "and", "e"}
DECIMAL_WORDS = {"virgule", "point", "comma", "virgola"}
CURRENCY = {"€", "euro", "euros", "eur", "balle", "balles", "boules"}
SUBUNIT = {"centime", "centimes", "cts", "centesimo", "centesimi"}
ARTICLES = {"un", "une", "uno", "una"}

# Italian writes numbers as one word ("ventitré", "centocinquanta", "duemila"):
# split them into known parts. Elided tens ("vent", "trent") come before "uno"/"otto".
IT_PARTS = sorted(
    ["diciassette", "diciannove", "quattordici", "diciotto", "quindici", "tredici", "undici",
     "dodici", "sedici", "dieci", "venti", "trenta", "quaranta", "cinquanta", "sessanta",
     "settanta", "ottanta", "novanta", "vent", "trent", "quarant", "cinquant", "sessant",
     "settant", "ottant", "novant", "cento", "cent", "mille", "mila", "uno", "un", "due",
     "tre", "tré", "quattro", "cinque", "sei", "sette", "otto", "nove"],
    key=len, reverse=True,
)
IT_ELIDED = {"vent": 20, "trent": 30, "quarant": 40, "cinquant": 50, "sessant": 60,
             "settant": 70, "ottant": 80, "novant": 90, "un": 1}


def _split_italian(word: str) -> list[str] | None:
    if not word:
        return []
    for part in IT_PARTS:
        if word.startswith(part):
            rest = _split_italian(word[len(part):])
            if rest is not None:
                return [part, *rest]
    return None


FILLERS = {
    "ho", "speso", "pagato", "comprato", "per", "di", "del", "della", "dello", "dei", "degli",
    "delle", "il", "lo", "gli", "i", "al", "alla", "allo", "ai", "da", "dal", "dalla", "e",
    "j'ai", "jai", "paye", "payé", "depense", "dépensé", "achete", "acheté", "pour",
    "de", "du", "des", "le", "la", "les", "un", "une", "au", "aux", "a", "à", "en",
    "et", "i", "spent", "paid", "bought", "for", "on", "at", "the", "of", "and", "some",
}


def normalize(s: str) -> str:
    s = unicodedata.normalize("NFD", s.lower())
    return "".join(c for c in s if unicodedata.category(c) != "Mn")


def tokenize(text: str) -> list[str]:
    text = text.lower().replace("’", "'").replace("-", " ")
    return re.findall(r"\d+(?:[.,]\d+)?|€|[^\W\d_]+(?:'[^\W\d_]*)?", text)


def _is_number_word(tok: str, lang: str) -> bool:
    if tok in NUMBER_WORDS or tok in HUNDREDS or tok in THOUSANDS or tok in IT_ELIDED:
        return True
    # "deux cents" = 200 in French, but "fifty cents" = 0.50 in English.
    return tok == "cents" and lang.startswith("fr")


def _words_value(words: list[str]) -> int:
    total, current = 0, 0
    for w in words:
        if w in JOINERS:
            continue
        if w in THOUSANDS:
            total += (current or 1) * 1000
            current = 0
        elif w in HUNDREDS or w == "cents":
            current = (current or 1) * 100
        elif w in ("vingt", "vingts") and current % 100 == 4:
            current += 76  # quatre-vingt = 80
        else:
            current += NUMBER_WORDS.get(w) or IT_ELIDED[w]
    return total + current


def _expand_italian(tokens: list[str]) -> list[str]:
    out: list[str] = []
    for tok in tokens:
        parts = _split_italian(tok) if len(tok) > 4 and tok not in NUMBER_WORDS else None
        # Only expand real compounds ("ventitré"), not words that merely start with a number.
        out.extend(parts if parts and len(parts) > 1 else [tok])
    return out


def _words_to_numbers(tokens: list[str], lang: str) -> list[str]:
    if lang.startswith("it"):
        tokens = _expand_italian(tokens)
    out: list[str] = []
    i = 0
    while i < len(tokens):
        if not _is_number_word(tokens[i], lang):
            out.append(tokens[i])
            i += 1
            continue
        j = i
        seq: list[str] = []
        while j < len(tokens):
            if _is_number_word(tokens[j], lang):
                seq.append(tokens[j])
                j += 1
            elif (tokens[j] in JOINERS and tokens[j] != "e" and seq and j + 1 < len(tokens)
                  and _is_number_word(tokens[j + 1], lang)):
                seq.append(tokens[j])
                j += 1
            else:
                break
        nxt = tokens[j] if j < len(tokens) else ""
        # A lone "un"/"une"/"uno"/"una" is usually an article ("un café"), not a number.
        if len(seq) == 1 and seq[0] in ARTICLES and nxt not in CURRENCY:
            out.append(tokens[i])
            i += 1
            continue
        out.append(str(_words_value(seq)))
        i = j
    return out


def _num(tok: str) -> float | None:
    if re.fullmatch(r"\d+(?:[.,]\d+)?", tok):
        return float(tok.replace(",", "."))
    return None


def _merge_decimals(tokens: list[str]) -> list[str]:
    out: list[str] = []
    i = 0
    while i < len(tokens):
        if (i + 2 < len(tokens) and tokens[i + 1] in DECIMAL_WORDS
                and re.fullmatch(r"\d+", tokens[i]) and re.fullmatch(r"\d+", tokens[i + 2])):
            out.append(f"{tokens[i]}.{tokens[i + 2]}")
            i += 3
        else:
            out.append(tokens[i])
            i += 1
    return out


def _find_amount(tokens: list[str], lang: str):
    """Return (amount, start, end) of the best amount candidate, or None."""
    subunits = SUBUNIT | ({"cents", "cent"} if not lang.startswith("fr") else set())
    candidates = []
    consumed = 0  # tokens already used by a previous candidate ("10 e 50")
    for i, tok in enumerate(tokens):
        val = _num(tok) if i >= consumed else None
        if val is None:
            continue
        j = i + 1
        has_currency = False
        if j < len(tokens) and tokens[j] in CURRENCY:
            has_currency = True
            j += 1
            k = j + 1 if j < len(tokens) and tokens[j] in JOINERS else j
            cents = _num(tokens[k]) if k < len(tokens) else None
            if cents is not None and cents.is_integer() and cents < 100:
                val += cents / 100
                j = k + 1
                if j < len(tokens) and tokens[j] in subunits:
                    j += 1
        elif j < len(tokens) and tokens[j] in subunits:
            val /= 100
            has_currency = True
            j += 1
        elif (j + 1 < len(tokens) and tokens[j] == "e" and val.is_integer()
              and re.fullmatch(r"\d{1,2}", tokens[j + 1])):
            # Italian price style: "dieci e cinquanta" = 10,50
            val += int(tokens[j + 1]) / 100
            j += 2
            if j < len(tokens) and tokens[j] in CURRENCY:
                has_currency = True
                j += 1
        elif i > 0 and tokens[i - 1] == "€":
            has_currency = True
        candidates.append((has_currency, round(val, 2), i, j))
        consumed = j
    if not candidates:
        return None
    with_currency = [c for c in candidates if c[0]]
    best = with_currency[0] if with_currency else candidates[-1]
    return best[1], best[2], best[3]


def _clean_description(tokens: list[str]) -> str:
    words = [t for t in tokens if t not in CURRENCY]
    while words and (words[0] in FILLERS or words[0] in JOINERS):
        words.pop(0)
    while words and (words[-1] in FILLERS or words[-1] in JOINERS):
        words.pop()
    if words:
        words[0] = re.sub(r"^(?:[dl]|dell|all|nell|sull|dall|un)'", "", words[0])
    desc = " ".join(words).strip()
    return desc[:1].upper() + desc[1:]


def guess_category(text: str, categories) -> int | None:
    norm_tokens = set(tokenize(normalize(text)))
    norm_tokens |= {t.rstrip("sx") for t in norm_tokens}
    norm_tokens |= {t.split("'", 1)[1] for t in norm_tokens if "'" in t}
    norm_text = normalize(text)
    best_id, best_score = None, 0
    for cat in categories:
        keywords = [normalize(k.strip()) for k in (cat.keywords or "").split(",") if k.strip()]
        keywords.append(normalize(cat.name))
        score = 0
        for kw in keywords:
            if " " in kw:
                score += kw in norm_text
            else:
                score += kw in norm_tokens or kw.rstrip("sx") in norm_tokens
        if score > best_score:
            best_id, best_score = cat.id, score
    return best_id


def parse_expense(text: str, categories, lang: str = "it") -> dict:
    lang = (lang or "it").lower()
    tokens = _merge_decimals(_words_to_numbers(tokenize(text), lang))
    found = _find_amount(tokens, lang)
    amount = None
    rest = tokens
    if found:
        amount, start, end = found
        rest = tokens[:start] + tokens[end:]
    category_id = guess_category(text, categories)
    if category_id is None:
        other = next((c for c in categories if normalize(c.name) in ("other", "autre", "altro")), None)
        category_id = other.id if other else None
    return {
        "amount": amount,
        "description": _clean_description(rest),
        "category_id": category_id,
        "transcript": text,
    }
