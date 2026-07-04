from django.db import models

class Product(models.Model):
    name = models.CharField(max_length=100)
    description = models.TextField()

    def to_dict(self):
        return {'id': self.id, 'name': self.name, 'description': self.description}
