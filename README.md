**Deprecation Notice:** I no longer work in a company that utilizes bamboo, so I can no longer test future work.  Please feel free to fork and take it over to add new features.

Bamboo-CI
========

Simple library to consume the API provided on Atlassian's Bamboo CI Server.

Usage
=====

    var Bamboo = require('bamboo-ci');

    var bamboo = new Bamboo('http://bamboo.mycompany.com', 'my', 'Password!');
    bamboo.getServerStatus().then(console.log);
    bamboo.getBambooInfo().then(console.log); // This route requires auth.

This is the initial version to just give basic endpoints, however, it will shortly have some helpers to enable better branch and build management.

