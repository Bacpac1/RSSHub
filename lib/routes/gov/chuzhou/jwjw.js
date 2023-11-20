const url = require('url');
const got = require('@/utils/got');
const cheerio = require('cheerio');
const { parseDate } = require('@/utils/parse-date');

const root_url = 'http://www.czlz.gov.cn';

const config = {
    scdc: {
        link: '/Class_199/Index.aspx',
        title: '审查调查',
    },
    djzwcf: {
        link: '/Class_200/Index.aspx',
        title: '党纪政务处分',
    },
};

module.exports = async (ctx) => {
    const cfg = config[ctx.params.caty];
    // if (!cfg) {
    //     throw Error('Bad category. See <a href="https://docs.rsshub.app/routes/government#wu-han-dong-hu-xin-ji-shu-kai-fa-qu">docs</a>');
    // }

    const current_url = url.resolve(root_url, cfg.link);
    const response = await got({
        method: 'get',
        url: current_url,
    });

    const $ = cheerio.load(response.data);
    const list = $('ul li')
        .slice(0, 20)
        .map((_, item) => {
            item = $(item);
            const a = item.find('a[href]');
            const span = item.find('span');
            return {
                title: a.text(),
                link: url.resolve(current_url, a.attr('href')),
                pubDate: parseDate(span.text(), 'YYYY-MM-DD'),
            };
        })
        .get();

    const items = await Promise.all(
        list.map((item) =>
            ctx.cache.tryGet(item.link, async () => {
                const res = await got({ method: 'get', url: item.link });
                const content = cheerio.load(res.data);

                item.description = content('div.c_content_overflow').html();
                return item;
            })
        )
    );

    ctx.state.data = {
        title: '滁州纪委监委 - ' + cfg.title,
        link: root_url,
        item: items,
    };
};
