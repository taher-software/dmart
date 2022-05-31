from fastapi import APIRouter, Path
import re
import utils.db as db
import models.api as api
import utils.regex as regex
import models.core as core
from fastapi.responses import FileResponse
from typing import Any

router = APIRouter()

# Retrieve publically-available content


@router.post("/query", response_model=api.Response, response_model_exclude_none=True)
async def query_entries(query: api.Query) -> api.Response:
    total, records = db.serve_query(query)
    return api.Response(
        status=api.Status.success,
        records=records,
        attributes={"total": total, "returned": len(records)},
    )


"""
@router.get("/body/{subpath:path}/{shortname}")
async def get_body(
    subpath: str = Path(..., regex=regex.SUBPATH),
    shortname: str = Path(..., regex=regex.SHORTNAME),
) -> dict[str, Any]:
    meta = db.load(subpath, shortname, core.Media)
    if meta.payload is None or not isinstance(meta.payload.body, dict):
        raise api.Exception(
            404,
            error=api.Error(
                type="media", code=221, message="Request object is not available"
            ),
        )

    # TODO check security labels for pubblic access
    # assert meta.is_active
    return meta.payload.body
"""


# Public payload retrieval; can be used in "src=" in html pages
@router.get("/payload/{subpath:path}/{shortname}.{ext}")
async def get_payload(
    subpath: str = Path(..., regex=regex.SUBPATH),
    shortname: str = Path(..., regex=regex.SHORTNAME),
    ext: str = Path(..., regex=regex.EXT),
) -> FileResponse:
    if re.match(regex.IMG_EXT, ext): 
        meta_class_type = core.Media
    elif ext in ["json", "md"]: 
        meta_class_type = core.Content
    else:
        raise api.Exception(
            404,
            error=api.Error(
                type="media", code=220, message="Request object is not available"
            ),
        )
    #path, filename = db.metapath(subpath, shortname, core.Media)
    meta = db.load(subpath, shortname, meta_class_type)
    if (
        meta.payload is None
        or meta.payload.body is None
        or meta.payload.body != f"{shortname}.{ext}"
    ):
        raise api.Exception(
            404,
            error=api.Error(
                type="media", code=220, message="Request object is not available"
            ),
        )

    # TODO check security labels for pubblic access
    # assert meta.is_active
    payload_path = db.payload_path(subpath, meta_class_type)
    media_file = payload_path / str(meta.payload.body)
    return FileResponse(media_file)


@router.post("/submit")
async def submit() -> api.Response:
    return api.Response(status=api.Status.success)
