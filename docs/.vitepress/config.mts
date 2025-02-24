import {defineConfig} from 'vitepress';
import v5 from './5.x';
import v4 from './4.x';
import v3 from './3.x';
import v2 from './2.x';
import v1 from './1.x';

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
                    {text: '5.x', link: '/5.x/'},
                    {text: '4.x', link: '/4.x/'},
                    {text: '3.x', link: '/3.x/'},
                    {text: '2.x', link: '/2.x/'},
                    {text: '1.x', link: '/1.x/'},
                ],
            },
        ],

        sidebar: {
            '/5.x/': v5('/5.x'),
            '/4.x/': v4('/4.x'),
            '/3.x/': v3('/3.x'),
            '/2.x/': v2('/2.x'),
            '/1.x/': v1('/1.x'),
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
            copyright: 'Copyright © 2025 Cloud Creativity Ltd',
        },

        outline: 'deep',
    },

})
