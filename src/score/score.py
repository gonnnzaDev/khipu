PASS = "PASS"
REVIEW = "REVIEW"
FAIL = "FAIL"

GREEN = "GREEN"
YELLOW = "YELLOW"
RED = "RED"

APPROVE = "APPROVE"
REVIEW_RECOMMENDATION = "REVIEW"
BLOCK = "BLOCK"

BASE_SCORE = 100

HARD_BLOCK_CHECKS = {
    "supplier_match",
    "subtotal_math",
    "total_math",
    "duplicate_invoice",
    "missing_critical_field",
}


def calculate_score(checks, ocr_confidence=None):
    score = BASE_SCORE
    hard_block = False

    for check in checks:
        check_id = check.get("id")
        status = check.get("status")

        if status == PASS:
            continue

        if check_id in HARD_BLOCK_CHECKS and status == FAIL:
            hard_block = True

        if check_id == "quantity_match" and status == FAIL:
            score -= 40
        elif check_id == "delivery_match" and status == FAIL:
            score -= 30
        elif check_id == "price_match" and status == REVIEW:
            score -= 15
        elif check_id == "price_match" and status == FAIL:
            score -= 35
        elif check_id == "minor_field":
            score -= 8

    if ocr_confidence is not None and ocr_confidence < 0.6:
        score -= 10

    score = max(0, min(100, score))

    if hard_block and score >= 70:
        score = 69

    return score


def status_from_score(score):
    if score >= 90:
        return GREEN
    if score >= 70:
        return YELLOW
    return RED


def recommendation_from_status(status):
    if status == GREEN:
        return APPROVE
    if status == YELLOW:
        return REVIEW_RECOMMENDATION
    return BLOCK
