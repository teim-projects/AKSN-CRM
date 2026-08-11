from rest_framework.pagination import PageNumberPagination

class FlexiblePagination(PageNumberPagination):
    page_size = 1000
    page_size_query_param = 'page_size'
    max_page_size = 10000

    def get_page_size(self, request):
        if self.page_size_query_param:
            try:
                val = request.query_params.get(self.page_size_query_param) or request.query_params.get('limit')
                if val is not None:
                    val = int(val)
                    if val <= 0:
                        return None
                    return min(val, self.max_page_size)
            except (KeyError, ValueError):
                pass
        return self.page_size


class StaffPagination(FlexiblePagination):
    pass
