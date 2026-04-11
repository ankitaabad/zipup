-- internal_utils.lua
local _M = {}
local cjson = require "cjson.safe"
-- Normalize host (lowercase + strip port)
function _M.normalize_host(host)
    if not host then return nil end
    host = string.lower(host)
    host = host:gsub(":%d+$", "") -- remove port
    return host
end

-- Check if host is IP (IPv4 + basic IPv6)
function _M.is_ip(host)
    if not host then return false end

    -- IPv4
    if string.match(host, "^%d+%.%d+%.%d+%.%d+$") then
        return true
    end

    -- IPv6 (basic check)
    if string.find(host, ":") then
        return true
    end

    return false
end



function _M.is_whitelisted_domain(host)
    ngx.log(ngx.INFO, "[whitelist] input host: ", host)

    if not host then
        ngx.log(ngx.WARN, "[whitelist] host is nil")
        return false
    end

    host = string.lower(host):gsub(":%d+$", "")
    ngx.log(ngx.INFO, "[whitelist] normalized host: ", host)

    local dict = ngx.shared.whitelist_domains
    if not dict then
        ngx.log(ngx.ERR, "[whitelist] shared dict 'whitelist_domains' not found")
        return false
    end

    local domains_json = dict:get("domains")
    if not domains_json then
        ngx.log(ngx.WARN, "[whitelist] no domains found in shared dict")
        return false
    end

    ngx.log(ngx.INFO, "[whitelist] raw domains_json: ", domains_json)

    local domains = cjson.decode(domains_json)
    if not domains then
        ngx.log(ngx.ERR, "[whitelist] failed to decode domains JSON")
        return false
    end

    ngx.log(ngx.INFO, "[whitelist] decoded domains count: ", #domains)

    for i, domain in ipairs(domains) do
        ngx.log(ngx.DEBUG, "[whitelist] checking domain[", i, "]: ", domain)

        if domain == host then
            ngx.log(ngx.INFO, "[whitelist] MATCH found: ", host)
            return true
        end
    end

    ngx.log(ngx.WARN, "[whitelist] NO match for host: ", host)
    return false
end

-- Environment helper
function _M.is_dev()
    return os.getenv("ENV") == "development"
end

return _M