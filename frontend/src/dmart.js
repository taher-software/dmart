import dmart_fetch from '../custom-fetch.js';
import { website } from './space_config';
import { get } from 'svelte/store';
import signedin_user from './pages/managed/_stores/signedin_user';
import sha1 from "./sha1";

export async function dmart_register(shortname, display_name, email, password, invitation) {
  const data = { 
    resource_type:"user",
    subpath: "users",
    shortname: shortname,
    attributes: {
      email: email,
      password: password,
      display_name: display_name,
      invitation: invitation
    }
  };
  const url = `${website.backend}/user/create`;
  const headers = {'Content-Type': 'application/json', 'Accept': 'application/json', 'Connection': 'close'};
  const request = {
      method: 'POST',
      headers: headers,
      cache: 'no-cache', 
      mode: 'cors',
      body: JSON.stringify(data)
  };
  return await dmart_fetch(url, request);
}

export async function dmart_login(shortname, password) {
  const data = { 
    shortname: shortname,
    password: password
  };
  const url = `${website.backend}/user/login`;
  const headers = {'Content-Type': 'application/json', 'Accept': 'application/json', 'Connection': 'close'};
  const request = {
      method: 'POST',
      headers: headers,
      cache: 'no-cache', 
      mode: 'cors',
      body: JSON.stringify(data)
  };
  return await dmart_fetch(url, request);
}

export async function dmart_get_profile() {
  // TBD
}

export async function dmart_update_profile() {
  // TBD
}

async function dmart_request(request_data) {
  const url = `${website.backend}/managed/request`;
  const headers = {'Content-Type': 'application/json', 'Accept': 'application/json', 'Connection': 'close'};
  const request = {
      method: 'POST',
      headers: headers,
      credentials: 'include',
      cache: 'no-cache', 
      mode: 'cors',
      body: JSON.stringify(request_data)
  };
  return await dmart_fetch(url, request);
}

export async function dmart_query(query) {
  query.space_name = website.space_name;
  const url = `${website.backend}/managed/query`;
  const headers = {'Content-Type': 'application/json', 'Accept': 'application/json', 'Connection': 'close'};
  const request = {
      method: 'POST',
      headers: headers,
      credentials: 'include',
      cache: 'no-cache', 
      mode: 'cors',
      body: JSON.stringify(query)
  };
  return await dmart_fetch(url, request);
}

export async function dmart_tags() {
  const query = {
      "subpath":"/posts", 
      "resource_types": ["post"], 
      "query_type": "tags"
  };
  const json = await dmart_query(query);
  let tags = []; 
  if(json.results[0].status == "success") {
    json.records[0].attributes.tags.forEach( function(record) {
      let one = {
        name: record.tag,
        frequency: record.frequency
      };  
      tags.push(one);
    });
  }
  return tags;
}

export async function dmart_pub_query(subpath, resource_types, resource_shortnames = [], query_type = "subpath", search ="*", limit=10, offset=0) {
  const url = `${website.backend}/query/${website.space_name}/${encodeURIComponent(subpath)}?query_type=${query_type}&search=${encodeURIComponent(search)}&resource_types=${resource_types}&resource_shortnames=${encodeURIComponent(resource_shortnames.join(','))}&offset=${offset}&limit=${limit}`;
  const headers = {'Accept': 'application/json', 'Connection': 'close'};
  const request = {
      method: 'GET',
      headers: headers,
      credentials: 'include',
      cache: 'no-cache', 
      mode: 'cors'
  };
  const json = await dmart_fetch(url, request);
  if(json.records) {
    json.records.forEach( record => {
      if(record.attachments.media) {
        record.attachments.media.forEach( attachment => {
          if(attachment.attributes.payload && attachment.attributes.payload.filepath) {
            attachment.url = `${website.backend}/media/${website.space_name}/${attachment.subpath}/${record.shortname}/${attachment.attributes.payload.filepath}`;
          }
        });
      }
    });
  }
  return json;
}

export async function dmart_pub_tags(subpath="/posts", resource_types=["post"]) {
  const json = await dmart_pub_query(subpath, resource_types, [], "tags");
  let tags = []; 
  if(json.results[0].status == "success") {
    json.records[0].attributes.tags.forEach( function(record) {
      let one = {
        name: record.tag,
        frequency: record.frequency
      };  
      tags.push(one);
    });
  }
  return tags;
}
export function dmart_entry_displayname(record) {
  record.attributes.displayname?record.attributes.displayname:record.shortname;
}

export function dmart_attachment_url(attachment) {
  if(attachment.attributes.payload && attachment.attributes.payload.filepath) {
    return `${website.backend}/media/${website.space_name}/${attachment.subpath}/${attachment.shortname}/${attachment.attributes.payload.filepath}`;
  }
}

export async function dmart_entries(subpath, resource_types, resource_shortnames = [], query_type = "subpath", search ="", limit=20) {
  const query = { 
     "subpath":subpath, 
      "resource_types": resource_types, 
      "resource_shortnames": resource_shortnames, 
      query_type: query_type, 
      search: search 
    };
  if(limit) {
    query.limit = limit;
  }
  const json = await dmart_query(query);
  // console.log("JSON: ", json);
  let records = []; 
  if(json.status == "success") {
    json.records.forEach( function(record) {
      for(const attachment_type in record.attachments) {
        //console.log("Attachment type: ", attachment_type);
        //console.log("Attachments of type: ", record.attachments[attachment_type]);
        record.attachments[attachment_type] = record.attachments[attachment_type].map( attachment => {
          if(attachment.attributes.payload && attachment.attributes.payload.filepath) {
            attachment.url = `${website.backend}/media/${website.space_name}/${attachment.subpath}/${record.shortname}/${attachment.attributes.payload.filepath}`;
          }
          return attachment;
        });
      }
      //record.displayname = record.attributes.displayname?record.attributes.displayname:record.shortname;
      record.displayname = record?.attributes?.displayname || record.shortname;
      records.push(record);
    });
  }
  return records;
}


export async function dmart_pub_submit(interaction_type, subpath, parent_shortname=null, attributes = {}) {
  //console.log("Record: ", record, "Intraction: ", interaction_type);
  let curruser = get(signedin_user).shortname || "anon";
  const request = { 
    actor_shortname: curruser,
    space_name: website.space_name,
    request_type: "submit",
    records:[{
      resource_type: interaction_type,
      shortname: "dummy",
      subpath: subpath,
      attributes: attributes
    }]
  };

  if(parent_shortname)
    request.records[0].parent_shortname = parent_shortname;

  let formdata = new FormData();
  //console.log("Data: ", JSON.stringify(request));
  formdata.append("request", JSON.stringify(request));
  const browse_url = `${website.backend}/submit`;
  const browse_headers = {'Accept': 'application/json', 'Connection': 'close'};
  const browse_request = {
      method: 'POST',
      headers: browse_headers,
      credentials: 'include',
      cache: 'no-cache', 
      mode: 'cors',
      body: formdata
  };
  return dmart_fetch(browse_url, browse_request);
}

export async function dmart_postmedia(record, upload) {
  const request = { 
    actor_shortname: get(signedin_user).shortname,
    space_name: website.space_name,
    request_type: "create",
    records:[ record ]
  };
  let formdata = new FormData();
  //console.log("Data: ", JSON.stringify(request));
  formdata.append("request", JSON.stringify(request));
  formdata.append("file", upload);
  const browse_url = `${website.backend}/media`;
  const browse_headers = {'Accept': 'application/json', 'Connection': 'close'};
  const browse_request = {
      method: 'POST',
      headers: browse_headers,
      credentials: 'include',
      cache: 'no-cache', 
      mode: 'cors',
      body: formdata
  };
  return dmart_fetch(browse_url, browse_request);
}

export async function dmart_content(action, record) {
  const request = { 
    actor_shortname: get(signedin_user).shortname,
    space_name: website.space_name,
    request_type: action,
    records:[ record ]
  };
  return dmart_request(request);
}

export async function dmart_update_content(content) {
  content;
}

export async function dmart_delete_content(resource_type, subpath, shortname, parent_shortname = null) {
  const request = { 
    actor_shortname: get(signedin_user).shortname,
    space_name: website.space_name,
    request_type: "delete",
    records:[
      {
        resource_type: resource_type,
        subpath: subpath,
        shortname: shortname
      }
    ]
  };

  if(parent_shortname)
    request.records[0].parent_shortname = parent_shortname;

  console.log("Delete request: ", request);
  let resp = await dmart_request(request);
  return resp.results[0];
}

export async function dmart_folder(action, subpath, shortname) {
  const request = { 
    actor_shortname: get(signedin_user).shortname,
    space_name: website.space_name,
    request_type: action,
    records:[
      {
        resource_type: "folder",
        subpath: subpath,
        shortname: shortname
      }
    ]
  };
  let resp = await dmart_request(request);
  return resp.results[0];
}

export async function dmart_update_embedded(content_type, embedded, subpath, shortname, resource_type) {
  let record = {
    subpath: subpath,
    shortname: shortname,
    resource_type: resource_type,
    attributes: {
      payload: {
        checksum: `sha1:${sha1(embedded)}`,
        embedded: embedded,
        content_type: content_type, //"text/html; charset=utf8",
        bytesize: new Blob([embedded]).size
      }
    }
  };

  let resp = await dmart_content("update", record);
  return resp.results[0];
}


export async function dmart_move(subpath, shortname, newsubpath, newshortname) { 
}

