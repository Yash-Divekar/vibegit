from .repository import ProductRepository

class ProductService:
    def __init__(self, repository):
        self.repository = repository

    def list_products(self):
        return self.repository.get_all()

    def get_product(self, product_id):
        return self.repository.get_by_id(product_id)

    def create_product(self, data):
        return self.repository.create(data)

    def update_product(self, product_id, data):
        return self.repository.update(product_id, data)

    def delete_product(self, product_id):
        return self.repository.delete(product_id)

    def filter_products(self, name):
        return self.repository.filter_by_name(name)