import json
from django.http import JsonResponse
from django.views import View
from .services import ItemService
from .repositories import ItemRepository

class ItemView(View):
    service = ItemService(ItemRepository())

    def get(self, request, item_id=None):
        if item_id:
            item = self.service.get_item(item_id)
            return JsonResponse(item.to_dict() if item else {'error': 'Item not found'}, status=404)
        else:
            items = self.service.list_items()
            return JsonResponse([item.to_dict() for item in items], safe=False)

    def post(self, request):
        data = json.loads(request.body)
        item = self.service.create_item(data)
        return JsonResponse(item.to_dict(), status=201)

    def put(self, request, item_id):
        data = json.loads(request.body)
        item = self.service.update_item(item_id, data)
        return JsonResponse(item.to_dict() if item else {'error': 'Item not found'}, status=404)

    def delete(self, request, item_id):
        if self.service.delete_item(item_id):
            return JsonResponse({'status': 'deleted'}, status=204)
        return JsonResponse({'error': 'Item not found'}, status=404)