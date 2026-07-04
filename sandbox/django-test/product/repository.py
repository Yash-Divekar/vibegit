from .models import Product
from django.core.exceptions import ObjectDoesNotExist

class ProductRepository:
    def get_all(self):
        return Product.objects.all()

    def get_by_id(self, product_id):
        try:
            return Product.objects.get(id=product_id)
        except ObjectDoesNotExist:
            return None
    
    def create(self, data):
        return Product.objects.create(**data)

    def update(self, product_id, data):
        product = self.get_by_id(product_id)
        if product:
            for key, value in data.items():
                setattr(product, key, value)
            product.save()
            return product
        return None
    
    def delete(self, product_id):
        product = self.get_by_id(product_id)
        if product:
            product.delete()
            return True
        return False

    def filter_by_name(self, name):
        return Product.objects.filter(name__icontains=name)