import django_filters
from .models import lead_management


class LeadFilter(django_filters.FilterSet):
    created_at = django_filters.DateFromToRangeFilter()
    followup_date = django_filters.DateFromToRangeFilter()
    
    class Meta:
        model = lead_management
        fields = {
            'status': ['exact'],
            'priority': ['exact'],
            'pipeline_stage': ['exact'],
            'lead_source': ['exact'],
            'assigned_executive': ['exact'],
            'is_converted': ['exact'],
        }