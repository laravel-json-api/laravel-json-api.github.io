import prefix from './prefix';

export default (base) => [
    {
        text: 'Getting Started',
        collapsed: false,
        items: prefix(base, 'getting-started', [
            {text: 'Installation', link: ''},
            {text: 'Upgrade Guide', link: 'upgrade'},
            {text: 'Core Concepts', link: 'core-concepts'},
            {text: 'Directory Structure', link: 'directory-structure'},
        ]),
    },
    {
        text: 'Tutorial',
        collapsed: true,
        items: prefix(base, 'tutorial', [
            {text: '1. Getting Started', link: ''},
            {text: '2. Models', link: '02-models'},
            {text: '3. Server and Schemas', link: '03-server-and-schemas'},
            {text: '4. Relationships', link: '04-relationships'},
            {text: '5. Creating Resources', link: '05-creating-resources'},
            {text: '6. Modifying Resources', link: '06-modifying-resources'},
            {text: '7. Deleting Resources', link: '07-deleting-resources'},
            {text: '8. Fetching Resources', link: '08-fetching-resources'},
        ]),
    },
    {
        text: 'Servers',
        collapsed: false,
        items: prefix(base, 'servers', [
            {text: 'The Basics', link: ''},
            {text: 'Events', link: 'events'},
        ]),
    },
    {
        text: 'Schemas',
        collapsed: false,
        items: prefix(base, 'schemas', [
            {text: 'The Basics', link: ''},
            {text: 'Identifier', link: 'identifier'},
            {text: 'Attributes', link: 'attributes'},
            {text: 'Relationships', link: 'relationships'},
            {text: 'Eager Loading', link: 'eager-loading'},
            {text: 'Sorting', link: 'sorting'},
            {text: 'Pagination', link: 'pagination'},
            {text: 'Filters', link: 'filters'},
            {text: 'Soft Deleting', link: 'soft-deleting'},
        ]),
    },
    {
        text: 'Routing',
        collapsed: false,
        items: prefix(base, 'routing', [
            {text: 'Routing', link: ''},
            {text: 'Controllers', link: 'controllers'},
            {text: 'Writing Actions', link: 'writing-actions'},
            {text: 'Custom Actions', link: 'custom-actions'},
        ]),
    },
    {
        text: 'Requests',
        collapsed: false,
        items: prefix(base, 'requests', [
            {text: 'The Basics', link: ''},
            {text: 'Authorization', link: 'authorization'},
            {text: 'JSON:API Compliance', link: 'compliance'},
            {text: 'Resources', link: 'resources'},
            {text: 'Query Parameters', link: 'query-parameters'},
        ]),
    },
    {
        text: 'Responses',
        collapsed: false,
        items: prefix(base, 'responses', [
            {text: 'JSON:API Documents', link: ''},
            {text: 'Errors', link: 'errors'},
        ]),
    },
    {
        text: 'API Resources',
        collapsed: true,
        items: prefix(base, 'resources', [
            {text: 'The Basics', link: ''},
            {text: 'Attributes', link: 'attributes'},
            {text: 'Relationships', link: 'relationships'},
            {text: 'Meta', link: 'meta'},
            {text: 'Links', link: 'links'},
        ]),
    },
    {
        text: 'Digging Deeper',
        collapsed: false,
        items: prefix(base, 'digging-deeper', [
            {text: 'Artisan Console', link: 'artisan'},
            {text: 'Countable', link: 'countable'},
            {text: 'Localisation', link: 'localisation'},
            {text: 'Proxies', link: 'proxies'},
            {text: 'Non-Eloquent Models', link: 'non-eloquent'},
            {text: 'Polymorphic to Many', link: 'polymorphic-to-many'},
        ]),
    },
    {
        text: 'Testing',
        collapsed: false,
        items: prefix(base, 'testing', [
            {text: 'Getting Started', link: ''},
            {text: 'Resources', link: 'resources'},
            {text: 'Relationships', link: 'relationships'},
            {text: 'Requests', link: 'requests'},
            {text: 'Assertions', link: 'assertions'},
        ]),
    },
];
