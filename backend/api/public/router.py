
from fastapi import APIRouter, Body

router = APIRouter()

@router.post('/request')
async def main_request():
    return {"Hello": True, "values": { "1":"2"}}

@router.get('/media')
async def get_media():
    return {}
