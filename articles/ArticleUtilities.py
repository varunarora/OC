class ArticleUtilities():

    @staticmethod
    def buildBreadcrumb(category):
        # Create breadcrumb list and add the current category as current node
        breadcrumb = []
        breadcrumb.append(category)

        while True:
            breadcrumb.append(category.parent)
            # HACK: Need to look for root object using something unique like PK
            if category.parent.title == "OpenCurriculum":
                break
            else:
                category = category.parent

        # Returns a reverse breadcrumb
        return ArticleUtilities.urlize(breadcrumb)

    @staticmethod
    def urlize(breadcrumb):
        current_parent = ''

        for cat in reversed(breadcrumb):
            if cat.title == "OpenCurriculum":
                cat.url = 'opencurriculum'
            else:
                current_parent += cat.slug + '/'
                cat.url = current_parent

        # Remove the trailing slash at the end of every category URL
        for b in breadcrumb:
            if b.url[-1] == '/':
                b.url = b.url[:-1]

        return breadcrumb
