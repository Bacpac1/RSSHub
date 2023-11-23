const url = require('url');
const got = require('@/utils/got');
const cheerio = require('cheerio');
const { parseDate } = require('@/utils/parse-date');

const root_url = 'http://www.czlz.gov.cn/';

const config = {
    sc: {
        link: '/Class_199/Index.aspx',
        title: '审查调查',
    },
    cf: {
        link: '/Class_200/Index.aspx',
        title: '党纪政务处分',
    },
};

module.exports = async (ctx) => {
    const cfg = config[ctx.params.caty];
    if (!cfg) {
        throw Error('Bad category. See <a href="https://docs.rsshub.app/government#chu-zhou-shi-ji-wei-jian-wei">docs</a>');
    }

    const current_url = url.resolve(root_url, cfg.link);
    const response = await got({
        method: 'get',
        url: current_url,
    });

    const $ = cheerio.load(response.data);
    const list = $('.middle_middle_zw li:not(.blank)')
        .slice(0, 20)
        .map((_, item) => {
            item = $(item);
            const a = item.find('a[href]');
            const span = item.find('span');
            return {
                title: a.text(),
                link: url.resolve(root_url, a.attr('href')),
                pubDate: parseDate(span.text(), 'YYYY-MM-DD'),
            };
        })
        .get();

    const items = await Promise.all(
        list.map((item) =>
            ctx.cache.tryGet(item.link, async () => {
                const res = await got({ method: 'get', url: item.link });
                const content = cheerio.load(res.data);

                item.description = content('.c_content_text').html();
                return item;
            })
        )
    );

    ctx.state.data = {
        title: '滁州市纪委监委 - ' + cfg.title,
        link: root_url,
        item: items,
    };
};
