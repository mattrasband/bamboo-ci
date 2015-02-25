var request = require('request'),
    q = require('q'),
    url = require('url');

var API_EXTENSION = '/rest/api/latest';

var buildBasicAuthUrl = function(host, username, password) {
    var parsedUrl = url.parse(host);
    var builtUrl = '';
    builtUrl += (parsedUrl.protocol) ? parsedUrl.protocol : 'http';
    builtUrl += '//';
    if (username && password) {
        builtUrl += username + ':' + password + '@';
    }
    builtUrl += parsedUrl.host;
    return builtUrl;
};

var httpGet = function(uri, queryParams) {
    var deferred = q.defer();

    request({
        url: uri,
        method: 'GET',
        qa: queryParams,
        gzip: true,
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        }
    }, function(err, resp, body) {
        if (err) {
            deferred.reject(err);
            return;
        }

        if (resp.statusCode >= 300) {
            deferred.reject(resp);
            return;
        }

        deferred.resolve(body);
    });

    return deferred.promise;
};

var httpPost = function(uri, json) {
    var deferred = q.defer();

    request({
        url: uri,
        method: 'POST',
        body: json,
        json: true,
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        }
    }, function(err, resp, body) {
        if (err) {
            deferred.reject(err);
            return;
        }
        if (resp.statusCode >= 300) {
            deferred.reject(resp);
            return;
        }
        deferred.resolve(body);
    });

    return deferred.promise;
};

/**
 * Simple wrapper to interface with Atlassian's Bamboo CI Server API.
 *
 * Source for API: https://docs.atlassian.com/bamboo/REST/5.7.3
 *
 * Most endpoints have these common characteristics, controlled via a common
 * optional `opts` param.
 *  * Allow specific objects to be expanded beyond the base summary.
 *      opts = {expand: {string}} (see Atlassian's docs for specific endpoints not documented here)
 *  * Paginated, default is usually min(# of results or 25)
 *      opts = {max-results: {integer}, start-index: {integer}}
 *
 * For almost all urls that have projectKey and buildKey you can use the buildKey
 * returned for a specific branch to perform the operations on the desired target,
 * rather than just getting access to the top level project/plan.
 */
function Bamboo(host, username, password) {
    this.host = buildBasicAuthUrl(host, username, password) + API_EXTENSION;
}

/**
 * Get the status of the server.
 *
 * @returns {promise}: Successful resolution gives keys "reindexInProgress" and "state"
 */
Bamboo.prototype.getServerStatus = function() {
    var uri = this.host + '/server';
    return httpGet(uri);
};

// Untested
/**
 * Pause the server.
 *
 * @returns {promise}
 */
//Bamboo.prototype.pauseServer = function() {
//    var uri = this.host + '/server/pause';
//    return httpPost(uri);
//};

// Untested
/**
 * Resume the server.
 *
 * @returns {promise}
 */
//Bamboo.prototype.resumeServer = function() {
//    var uri = this.host + '/server/resume';
//    return httpPost(uri);
//};

/**
 * Get a list of plans on the bamboo server.
 *
 * @param opts {object}: System wide options parameter, added options:
 *  * enabled: {bool} - Shows only enabled/disabled plans (default: empty, e.g. show all)
 *  * expand: {string} - List of plans: plans.plan or List of plans with details: plans.plan.actions
 */
Bamboo.prototype.getPlans = function(opts) {
    var uri = this.host + '/plan';
    return httpGet(uri, opts);
};

/**
 * Get info on a project's build plan (this is not a build status!)
 *
 * @param projectKey {string}: Project key
 * @param buildKey {string}: Build plan key
 */
Bamboo.prototype.getPlan = function(projectKey, buildKey, opts) {
    var uri = this.host + '/plan/' + projectKey + '-' + buildKey;
    return httpGet(uri, opts);
};

/**
 * Get branches for a project's build plan (optionally for the specific job, if applicable)
 *
 * @param projectKey {string}: Project key
 * @param buildKey {string}: Build plan key
 *                           (note: if you need to include a jobkey, append it to the build key)
 */
Bamboo.prototype.getBranches = function(projectKey, buildKey, opts) {
    var uri = this.host + '/plan/' + projectKey + '-' + buildKey;
    return httpGet(uri, opts);
};

//Bamboo.prototype.createBranch = function(projectKey, buildKey, newBranchName, srcBranch) {};

/**
 * Get a specific branch, by name, for the project/build plan. Note: if you need
 * to include a jobkey, which seems rare, append it to the buildKey.
 *
 * It is likely that the main item of interest here is the build result, to get this
 * include {expand: 'latestResult'} in your options.
 *
 * @param projectKey {string}: Project Key
 * @param buildKey {string}: Build plan key
 * @param branchName {string}: Branch to find.
 */
Bamboo.prototype.getBranch = function(projectKey, buildKey, branchName, opts) {
    // Branches on bamboo have forward slashes replaced with hyphens.
    var uri = this.host + '/plan/' + projectKey + '-' + buildKey + '/branch/' + branchName.replace(/\//g, '-');
    return httpGet(uri, opts);
};

/**
 * Get labels for a build plan.
 *
 * @param projectKey {string}: Project Key
 * @param buildKey {string}: Build plan key
 */
Bamboo.prototype.getLabels = function(projectKey, buildKey, opts) {
    var uri = this.host + '/plan/' + projectKey + '-' + buildKey + '/label';
    return httpGet(uri, opts);
};

//Bamboo.prototype.addLabel = function(projectKey, buildKey, json) {};

// Untested
//Bamboo.prototype.deleteLabel = function(projectKey, buildKey, labelName) {
//    var uri = this.host + '/plan/' + projectKey + '-' + buildKey + '/label/' + labelName;
//    return httpDelte(uri);
//};

/**
 * Get a list of all version controlled branches on your VSC server.
 *
 * @param projectKey {string}: Project Key
 * @param buildKey {string}: Build plan key
 */
Bamboo.prototype.getVcsBranches = function(projectKey, buildKey, opts) {
    var uri = this.host + '/plan/' + projectKey + '-' + buildKey + '/vcsBranches';
    return httpGet(uri, opts);
};

/**
 * Get the queued builds (requires auth)
 */
Bamboo.prototype.getQueue = function(opts) {
    var uri = this.host + '/queue';
    return httpGet(uri, opts);
};

// Untested, docs needed!
/**
 * Enqueue a build for the specific plan (requires auth)
 *
 * @param projectKey {string}: Project Key
 * @param buildKey {string}: Build plan key
 * @param opts {object}: Params are helpful for this:
 *      * stage {string}: Name of stage to be executed
 *      * executeAllStages {bool}: force run of all stages, including manual.
 *      * customRevision
 */
Bamboo.prototype.enqueue = function(projectKey, buildKey, opts) {
    var uri = this.host + '/queue/' + projectKey + '-' + buildKey;
    return httpPost(uri, opts);
};

/**
 * Re-Enqueue a partially completed build.
 *
 * @param projectKey {string}: Project Key
 * @param buildKey {string}: Build plan key
 * @param opts {object}: Params are helpful for this:
 *      * stage {string}: Name of stage to be executed
 *      * executeAllStages {bool}: force run of all stages, including manual.
 */
Bamboo.prototype.reEnqueue = function(projectKey, buildKey, buildNumber, opts) {
    var uri = this.host + '/queue/' + projectKey + '-' + buildKey + '-' + buildNumber;
    return httpPost(uri, opts);
};

// Untested
/**
 * Remove a build from the queue, this has no effect if the build is not queued.
 *
 * @param projectKey {string}: Project Key
 * @param buildKey {string}: Build plan key
 * @param buildNumber {string|int}: Build number to cancel
 */
//Bamboo.prototype.dequeue = function(projectKey, buildKey, buildNumber) {
//    var uri = this.host + '/queue/' + projectKey + '-' + buildKey + '-' + buildNumber;
//    return httpDelete(uri);
//};

/**
 * Get a list of the latest build results for top level plans.
 *
 * @opts {object}
 *      * expand {string}: Expand specific details (artifacts|comments|labels|jiraIssues|stages)
 *      * favourite {bool}: Only show favorited plans
 *      * label {string}: Filter by a comma separated list of labels
 *      * issueKey {string}: Filter by a comma separated list of JIRA issues
 *      * includeAllStates {bool}: Return all build states (uncluding Unknown)
 *      * continuable {bool}: Filter results that may be continued, stopped in a Manual Stage
 *      * buildstate {string}: Filter by state (Unknown|Successful|Failed)
 *      * start-index {int}: Starting index of results to show
 *      * max-results {int}: Max size of returned list
 */
Bamboo.prototype.getTopLevelResult = function(opts) {
    var uri = this.host + '/result';
    return httpGet(uri, opts);
};

/**
 * Get a list of the latest builds for top level plans for a specified project.
 *
 * @param projectKey {string}: Project key
 * @param opts {object}:
 *      * expand {string}: expands build result details on request. Possible values are: artifacts, comments, labels, jiraIssues, stages. stages expand is available only for top level plans. It allows to drill down to job results using stages.stage.results.result. All expand parameters should contain results.result prefix.
 *      * favourite {bool}: filters build results list to show only results for favourite plans. Works only for authenticated user
 *      * label {string}: filter by comma separated list of labels
 *      * issueKey {string}: filter by comma separated list of Jira issue key related to result
 *      * includeAllStates {bool}: return all build results including Unknown states
 *      * continuable {bool}: filter only results that may be continued (stopped on Manual Stage)
 *      * buildstate {bool}: filter results by state, valid values are Unknown, Successful, Failed
 *      * start-index {int}: start index for results list (zero based)
 *      * max-results {int}: maximum size for returned list
 */
Bamboo.prototype.getProjectResult = function(projectKey, opts) {
    var uri = this.host + '/result/' + projectKey;
    return httpGet(uri, opts);
};

/**
 * Get build results related to a specific changeset (SHA1).
 *
 * @param sha1 {string}: Changeset SHA.
 */
Bamboo.prototype.getResultsBySha = function(sha1) {
    var uri = this.host + '/result/byChangeset/' + sha1;
    return httpGet(uri);
};

/**
 * Get a list of build results for a branch.
 *
 * @param projectKey {string}: Project key
 * @param buildKey {string}: Build plan key
 * @param branchName {string}: VCS Branch
 * @param opts {object}
 *      * expand
 *      * favourite
 *      * label
 *      * issueKey
 *      * includeAllStates
 *      * continuable
 *      * buildstate
 *      * start-index
 *      * max-results
 */
Bamboo.prototype.getBranchResults = function(projectKey, buildKey, branchName, opts) {
    var uri = this.host + '/result/' + projectKey + '-' + buildKey + '/branch/' + branchName.replace(/\//g, '-');
    return httpGet(uri, opts);
};

/**
 * Get the result of a specific build.  This is the "shortkey" retrieved for a
 * particular branch, for example.
 *
 * @param projectKey {string}: Project key
 * @param buildKey {string}: Build plan key/shortname
 * @param buildNum {int|string}: Specific build number, or "latest"
 * @param opts {object}
 *      * expand {string}: Expand specific details (changes|metadata|artifacts|comments|labels|jiraIssues|stages|logEntries|testResults)
 */
Bamboo.prototype.getResult = function(projectKey, buildKey, buildNum, opts) {
    var uri = this.host + '/result/' + projectKey + '-' + buildKey + '-' + buildNum;
    return httpGet(uri, opts);
};

/**
 * Get a list of all projects.
 *
 * @param opts {object}
 */
Bamboo.prototype.getProjects = function(opts) {
    var uri = this.host + '/project';
    return httpGet(uri, opts);
};

/**
 * Get a specific project.
 *
 * @param projectKey {string}
 */
Bamboo.prototype.getProject = function(projectKey, opts) {
    var uri = this.host + '/project/' + projectKey;
    return httpGet(uri, opts);
};

/**
 * Get the bamboo version info.
 */
Bamboo.prototype.getBambooInfo = function() {
    var uri = this.host + '/info';
    return httpGet(uri);
};

module.exports = Bamboo;
