// Fallback task definition for groups without a taskId (legacy 3051/3052 groups)
// Mirrors exactly what the server returns for the stone-gate task (id=1).
export const shimenTaskFallback = {
  id: 1,
  title: '石门湾研学记录',
  journalEnabled: true,
  phases: {
    before: {
      mode: 'form',
      title: '行前准备',
      icon: '🎒',
      sections: [
        {
          id: 'questions_section',
          targetKey: null,
          title: '💡 最想弄清楚的问题（最多3个）',
          hint: '出发前先想好，回来再看看有没有答案',
          fields: [
            {
              id: 'questions',
              type: 'repeating_text',
              count: 3,
              placeholders: ['你们最想弄清楚什么？', '还有别的问题吗？', '第三个问题（选填）'],
            },
          ],
        },
        {
          id: 'items_section',
          targetKey: null,
          title: '🎒 要带的东西',
          fields: [
            {
              id: 'items',
              type: 'checklist',
              options: ['📓 笔记本', '✏️ 铅笔/彩笔', '💧 水杯', '📸 相机/手机', '🌂 雨具（天气不好时）', '🎒 背包'],
              hasOther: true,
            },
          ],
        },
        {
          id: 'route_section',
          targetKey: null,
          title: '🗺️ 我们想走什么路线？',
          fields: [
            {
              id: 'route',
              type: 'radio',
              options: ['先参观展厅，再参观生产车间', '先参观生产车间，再参观展厅', '跟着老师的安排走'],
            },
          ],
        },
      ],
    },
    during: {
      mode: 'form',
      title: '行中探索',
      icon: '🔍',
      subPhases: [
        {
          n: 1,
          icon: '🏛️',
          title: '展厅探秘',
          doneKey: 'sub1Done',
          sections: [
            {
              id: 'exhibition',
              targetKey: 'exhibition',
              hint: '展厅里藏着许多小秘密，写下你发现的信息！',
              fields: [
                { id: 'd1', type: 'textarea', label: '📍 关于这里的地理位置和区域分布', placeholder: '你在地图上发现了什么？', rows: 3 },
                { id: 'd2', type: 'textarea', label: '🤖 传统农业 vs 现代农业有哪些不同？', placeholder: '比如无人机喷药、直播卖米…', rows: 3 },
                { id: 'd3', type: 'textarea', label: '🍚 大米有哪些不同的产品形式？', placeholder: '你看到了哪些大米的包装或产品？', rows: 3 },
                { id: 'count', type: 'number', label: '我一共发现了___个秘密！', placeholder: '?' },
              ],
            },
          ],
        },
        {
          n: 2,
          icon: '⚙️',
          title: '车间高科技',
          doneKey: 'sub2Done',
          sections: [
            {
              id: 'equipment_section',
              targetKey: null,
              hint: '稻米生产车间里有哪些高新科技？记录下来！',
              fields: [
                {
                  id: 'equipment',
                  type: 'table',
                  columns: [
                    { id: 'name', label: '名称', placeholder: '名称' },
                    { id: 'function', label: '它的作用是…', placeholder: '它的作用是…' },
                  ],
                  rows: 4,
                  rowLabel: '设备',
                },
              ],
            },
          ],
        },
        {
          n: 3,
          icon: '💡',
          title: '我还发现…',
          doneKey: 'sub3Done',
          isLast: true,
          sections: [
            {
              id: 'extra',
              targetKey: 'extra',
              hint: '你还发现了什么特别有趣的事情？自由记录！',
              fields: [
                { id: 'text', type: 'textarea', placeholder: '写下任何你觉得有意思的发现，比如机器的声音、米的颜色、工人叔叔做的事…', rows: 6 },
                { id: 'mood', type: 'emoji_picker', label: '此刻心情', options: ['😮', '😊', '🤔', '😎', '🤩', '😄'] },
              ],
            },
          ],
        },
      ],
    },
    after: {
      mode: 'form',
      title: '行后总结',
      icon: '💬',
      sections: [
        {
          id: 'resolved_section',
          targetKey: null,
          title: '🔄 行前的问题，现在有答案了吗？',
          fields: [
            { id: 'resolved', type: 'question_resolve', sourcePhase: 'before', sourceField: 'questions' },
          ],
        },
        {
          id: 'reflection_section',
          targetKey: null,
          title: '📝 我的研学感想',
          fields: [
            { id: 'reflection', type: 'textarea', rows: 6, placeholder: '写下这次研学最让你印象深刻的事，学到了什么，有什么想说的…' },
          ],
        },
        {
          id: 'finalMood_section',
          targetKey: null,
          title: '这次研学我的总体感受',
          fields: [
            { id: 'finalMood', type: 'emoji_picker', options: ['😊', '🤩', '😄', '🤔', '😮', '💪'] },
          ],
        },
      ],
    },
  },
}
