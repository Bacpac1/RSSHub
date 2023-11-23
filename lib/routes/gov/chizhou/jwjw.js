const url = require('url');
const got = require('@/utils/got');
const cheerio = require('cheerio');
const { parseDate } = require('@/utils/parse-date');

const root_url = 'http://www.czjjjcw.gov.cn';

const config = {
    sc: {
        link: '/News/showList/6701/page_1.html',
        title: '执纪审查',
    },
    cf: {
        link: 'News/showList/6700/page_1.html',
        title: '党纪政务处分',
    },
};

module.exports = async (ctx) => {
    const cfg = config[ctx.params.caty];
    // if (!cfg) {
    //     throw Error('Bad category. See <a href="https://docs.rsshub.app/government#chu-zhou-shi-ji-wei-jian-wei">docs</a>');
    // }

    const current_url = url.resolve(root_url, cfg.link);
    const response = await got({
        method: 'get',
        url: current_url,
    });

    const $ = cheerio.load(response.data);
    const list = $('.news_row dl')
        .slice(0, 10)
        .map((_, item) => {
            item = $(item);
            const a = item.find('a[href]');
            const span = item.find('.time');
            const date = $(span).text().slice(1, -1); 

            return {
                title: a.text(),
                link: url.resolve(root_url, a.attr('href')),
                pubDate: parseDate(date.text(), 'YYYY-MM-DD'),
            };
        })
        .get();

    const items = await Promise.all(
        list.map((item) =>
            ctx.cache.tryGet(item.link, async () => {
                const res = await got({ method: 'get', url: item.link });
                const content = cheerio.load(res.data);

                item.description = content('.text').html();
                return item;
            })
        )
    );

    ctx.state.data = {
        title: '池州市纪委监委 - ' + cfg.title,
        link: root_url,
        item: items,
    };
};
