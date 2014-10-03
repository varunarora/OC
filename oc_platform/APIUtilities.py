from django.shortcuts import HttpResponse
from django.http import HttpResponseBadRequest
import json

def _api_success(context={}):
    status = dict({'status': 'true'}.items() + context.items())
    return HttpResponse(
        json.dumps(status), 200,
        content_type="application/json"
    )

def success(context={}):
    return HttpResponse(
        json.dumps(context), 200,
        content_type="application/json"
    )

def failure(context={}):
    return HttpResponseBadRequest(
        json.dumps(context), 400,
        content_type="application/json"
    )

def _api_failure(context={}):
    status = dict({'status': 'false'}.items() + context.items())
    return HttpResponse(
        json.dumps(status), 400,
        content_type="application/json"
    )


def _api_not_found(context={}):
    status = dict({'status': 'false'}.items() + context.items())
    return HttpResponse(
        json.dumps(status), 404,
        content_type="application/json"
    )


def _api_unauthorized_failure(context={}):
    status = dict({'status': 'false'}.items() + context.items())
    return HttpResponse(
        json.dumps(status), 401,
        content_type="application/json"
    )
