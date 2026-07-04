from .models import Item
from django.core.exceptions import ObjectDoesNotExist

class ItemRepository:
    def get_all(self):
        return Item.objects.all()
    
    def get_by_id(self, item_id):
        try:
            return Item.objects.get(id=item_id)
        except ObjectDoesNotExist:
            return None

    def create(self, data):
        return Item.objects.create(**data)

    def update(self, item_id, data):
        item = self.get_by_id(item_id)
        if item:
            for key, value in data.items():
                setattr(item, key, value)
            item.save()
            return item
        return None

    def delete(self, item_id):
        item = self.get_by_id(item_id)
        if item:
            item.delete()
            return True
        return False