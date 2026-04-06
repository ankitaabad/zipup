local cjson = require "cjson.safe"
local http = require "resty.http"

local _M = {}

local BASE_URL = "http://zipup:8080/api/__zipup_internal__"

-- 🔁 shared HTTP helper (important)
local function make_request(path)
    local httpc = http.new()
    httpc:set_timeout(3000)

    local res, err = httpc:request_uri(BASE_URL .. path, {
        method = "GET",
        headers = {
            ["Zipup-Internal-Source"] = "openresty"
        }
    })

    if not res then
        return nil, "failed to call API: " .. (err or "")
    end

    if res.status ~= 200 then
        return nil, "API returned non-200: " .. res.status
    end

    local decoded, decode_err = cjson.decode(res.body)
    if not decoded then
        return nil, "invalid JSON response: " .. (decode_err or "")
    end

    return decoded
end

-- 📦 fetch routes
function _M.fetch_routes()
    local data, err = make_request("/routes")
    if not data or not data.routes then
        return nil, err or "invalid routes response"
    end

    return data.routes
end

-- 🌐 fetch domain whitelist
function _M.fetch_domain_whitelist()
    local data, err = make_request("/domain-whitelist")
    if not data or not data.domains then
        return nil, err or "invalid domain whitelist response"
    end

    return data.domains
end

return _M