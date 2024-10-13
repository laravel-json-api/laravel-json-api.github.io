import {defineConfig} from 'vitepress';
import v4 from './4.x';

// https://vitepress.dev/reference/site-config
export default defineConfig({
    title: "Laravel JSON:API",
    description: "Implement feature-rich JSON:API compliant APIs in your Laravel applications. Build your next standards-compliant API today.",
    themeConfig: {
        // https://vitepress.dev/reference/default-theme-config
        nav: [
            {
                text: 'Version',
                items: [
                    {text: '4.x', link: '/4.x/'},
                ],
            },
        ],

        sidebar: {
            '/4.x/': v4('/4.x'),
        },

        socialLinks: [
            {
                icon: 'slack',
                link: 'https://join.slack.com/t/laraveljsonapi/shared_invite/zt-e3oi2r4y-8nkmhzpKnPQViaXrkPJHtQ',
            },
            {
                icon: 'github',
                link: 'https://github.com/laravel-json-api/laravel',
            },
        ],

        footer: {
            message: 'Released under the MIT License.',
            copyright: 'Copyright © 2024 Cloud Creativity Ltd',
        },

        outline: 'deep',
    },

})