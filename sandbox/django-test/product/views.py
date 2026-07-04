import json
from django.http import JsonResponse
from django.views import View
from .service import ProductService
from .repository import ProductRepository

class ProductView(View):
    service = ProductService(ProductRepository())

    def get(self, request, product_id=None):
        if product_id:
            product = self.service.get_product(product_id)
            return JsonResponse(product.to_dict() if product else {'error': 'Product not found'}, status=404)
        else:
            items = self.service.list_products()
            return JsonResponse([product.to_dict() for product in items], safe=False)

    def post(self, request):
        data = json.loads(request.body)
        product = self.service.create_product(data)
        return JsonResponse(product.to_dict(), status=201)

    def put(self, request, product_id):
        data = json.loads(request.body)
        product = self.service.update_product(product_id, data)
        return JsonResponse(product.to_dict() if product else {'error': 'Product not found'}, status=404)

    def delete(self, request, product_id):
        if self.service.delete_product(product_id):
            return JsonResponse({'status': 'deleted'}, status=204)
        return JsonResponse({'error': 'Product not found'}, status=404)
