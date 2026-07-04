from django.test import TestCase
from .models import Item
from .repositories import ItemRepository

class ItemRepositoryTests(TestCase):
    def setUp(self):
        self.repository = ItemRepository()

    def test_create_item(self):
        item = self.repository.create({'name': 'Test Item', 'description': 'A test item.'})
        self.assertIsNotNone(item.id)

    def test_get_item(self):
        item = self.repository.create({'name': 'Test Item', 'description': 'A test item.'})
        retrieved_item = self.repository.get_by_id(item.id)
        self.assertEqual(retrieved_item.name, 'Test Item')

    def test_update_item(self):
        item = self.repository.create({'name': 'Test Item', 'description': 'A test item.'})
        updated_item = self.repository.update(item.id, {'name': 'Updated Name'})
        self.assertEqual(updated_item.name, 'Updated Name')

    def test_delete_item(self):
        item = self.repository.create({'name': 'Test Item', 'description': 'A test item.'})
        self.assertTrue(self.repository.delete(item.id))