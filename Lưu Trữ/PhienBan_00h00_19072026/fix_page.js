const fs = require('fs');
let text = fs.readFileSync('src/app/page.js', 'utf-8');

const marker1 = "task.status === 'completed' ? 'text-emerald-400' : 'text-amber-400'";
const firstIdx = text.indexOf(marker1);

if (firstIdx !== -1) {
    const startCut = text.indexOf('\n', firstIdx);
    const endCut = text.indexOf('{/* ──── TAB: BẢN ĐỒ GIS ──── */}');

    if (endCut !== -1 && startCut !== -1) {
        const correctClosing = `                        \n                        \`}>
                          {task.status === 'completed' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5 animate-pulse" />}
                          {task.status === 'completed' ? 'Hoàn thành' : 'Đang xử lý'}
                        </span>
                      </div>
                      <div className="mt-4 pt-3 border-t border-slate-800/60" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-between items-center text-[10px] text-slate-400 mb-1">
                          <span>Tiến độ:</span>
                          <span className="font-bold text-slate-200">{task.progress}%</span>
                        </div>
                        <input type="range" min="0" max="100" step="5"
                          value={task.progress}
                          disabled={updatingTaskId === task.id}
                          onChange={(e) => handleUpdateTaskProgress(task.id, parseInt(e.target.value))}
                          className="w-full accent-emerald-500 h-1 bg-slate-800 rounded-lg cursor-pointer disabled:opacity-40" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            </>
            )}
            </div>
          </div>
        )}

        `;
        const newText = text.substring(0, startCut) + correctClosing + text.substring(endCut);
        fs.writeFileSync('src/app/page.js', newText, 'utf-8');
        console.log("FIXED EXACTLY!");
    } else {
        console.log("End marker not found");
    }
} else {
    console.log("Start marker not found");
}
