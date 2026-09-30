import { successResponse } from './_lib/response.js';

export default async function handler(req, res) {
  // Dynamic sticker packs provided by backend cloud metadata
  const stickerPacks = [
    {
      id: 'cat_pack',
      name: 'Cat Moods 🐱',
      stickers: [
        { id: 'cat_1', url: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=200&auto=format&fit=crop&q=80', name: 'Cute Cat' },
        { id: 'cat_2', url: 'https://images.unsplash.com/photo-1573865526739-10659fec78a5?w=200&auto=format&fit=crop&q=80', name: 'Playful Cat' },
        { id: 'cat_3', url: 'https://images.unsplash.com/photo-1495360010541-f48722b34f7d?w=200&auto=format&fit=crop&q=80', name: 'Serious Cat' },
        { id: 'cat_4', url: 'https://images.unsplash.com/photo-1533738363-b7f9aef128ce?w=200&auto=format&fit=crop&q=80', name: 'Cool Cat' },
      ],
    },
    {
      id: 'dev_pack',
      name: 'Dev Life 💻',
      stickers: [
        { id: 'dev_1', url: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=200&auto=format&fit=crop&q=80', name: 'Coding' },
        { id: 'dev_2', url: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=200&auto=format&fit=crop&q=80', name: 'Laptop' },
        { id: 'dev_3', url: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=200&auto=format&fit=crop&q=80', name: 'Matrix Code' },
        { id: 'dev_4', url: 'https://images.unsplash.com/photo-1504639725590-34d0984388bd?w=200&auto=format&fit=crop&q=80', name: 'Bug Hunting' },
      ],
    },
    {
      id: 'express_pack',
      name: 'Reactions 🎉',
      stickers: [
        { id: 'react_1', url: 'https://images.unsplash.com/photo-1513151233558-d860c5398176?w=200&auto=format&fit=crop&q=80', name: 'Party' },
        { id: 'react_2', url: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=200&auto=format&fit=crop&q=80', name: 'Celebrate' },
        { id: 'react_3', url: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=200&auto=format&fit=crop&q=80', name: 'Sparkles' },
      ],
    }
  ];

  return successResponse(res, { stickerPacks });
}
