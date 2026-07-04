from .repositories import ItemRepository

class ItemService:
    def __init__(self, repository):
        self.repository = repository
    
    def list_items(self):
        return self.repository.get_all()

    def get_item(self, item_id):
        return self.repository.get_by_id(item_id)

    def create_item(self, data):
        return self.repository.create(data)

    def update_item(self, item_id, data):
        return self.repository.update(item_id, data)

    def delete_item(self, item_id):
        return self.repository.delete(item_id)