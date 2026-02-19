SKIPPED_MEAL_KEYWORDS = {
    '신청 안함',
    '선택 안함',
    '미신청'
}

DEFAULT_PEDIATRIC_MEAL = '일반식'
DEFAULT_GUARDIAN_MEAL = '신청 안함' # Database default or fallback if needed
DISPLAY_SKIPPED_SYMBOL = 'X'

# Mapping for display names (DB Value -> Display Value)
# Use this when you want to rename a meal type in the UI without changing the DB value
MEAL_DISPLAY_MAPPING = {
    # Example: '죽1': '소고기죽',
}
