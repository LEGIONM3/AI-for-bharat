from datetime import datetime
import logging
import boto3

logger = logging.getLogger(__name__)

def seed_preset_plans():
    """
    Seeds DynamoDB with preset learning plans.
    Called on server startup.
    Only seeds if plans don't already exist.
    """
    from data.preset_plans import PRESET_PLANS
    from config import settings

    dynamodb = boto3.resource(
        'dynamodb',
        region_name=settings.AWS_REGION
    )
    table = dynamodb.Table(
        settings.DYNAMODB_ROADMAPS_TABLE
    )

    seeded = 0
    for plan in PRESET_PLANS:
        # Check if already exists
        response = table.get_item(
            Key={'roadmap_id': plan['plan_id']}
        )
        existing = response.get('Item')

        if not existing:
            try:
                table.put_item(Item={
                    **plan,
                    'roadmap_id': plan['plan_id'],
                    'id': plan['plan_id'],
                    'is_preset': True,
                    'user_id': 'SYSTEM',
                    'status': 'preset',
                    'created_at': datetime.utcnow().isoformat()
                })
                seeded += 1
            except Exception as e:
                logger.error(f"Error seeding plan {plan['plan_id']}: {e}")

    return seeded
