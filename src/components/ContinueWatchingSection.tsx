import React, { useState, useEffect } from 'react';
import ContinueWatchingCard from './ContinueWatchingCard';
import { History } from 'lucide-react';
import axios from 'axios';

interface ContinueWatchingSectionProps {
  items: any[];
}

const ContinueWatchingSection: React.FC<ContinueWatchingSectionProps> = ({ items }) => {
  const [localItems, setLocalItems] = useState(items);
  
  useEffect(() => {
    setLocalItems(items);
  }, [items]);

  if (!localItems || localItems.length === 0) return null;

  const handleRemove = async (slug: string) => {
    try {
      await axios.delete('/api/history/' + slug, { withCredentials: true });
      setLocalItems(prev => prev.filter(i => i.movie_slug !== slug));
    } catch(err) { 
      console.error(err); 
    }
  };

  return (
    <section className="py-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-1 h-7 bg-gradient-to-b from-amber-400 to-orange-500 rounded-full" />
        <History className="w-5 h-5 text-amber-400/70" />
        <h2 className="text-xl md:text-2xl font-bold text-white">Xem Tiếp</h2>
        <span className="text-xs font-semibold bg-amber-500/10 text-amber-400 px-2.5 py-0.5 rounded-full border border-amber-500/20">
          {localItems.length}
        </span>
      </div>
      <div className="flex gap-3 sm:gap-4 overflow-x-auto pb-2 snap-x snap-mandatory scroll-fade" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        {localItems.slice(0, 12).map((item) => (
          <div key={item.id} className="min-w-[140px] sm:min-w-[160px] md:min-w-[180px] lg:min-w-[200px] max-w-[200px] snap-start shrink-0">
            <ContinueWatchingCard 
              item={item} 
              onRemove={() => handleRemove(item.movie_slug)} 
            />
          </div>
        ))}
      </div>
    </section>
  );
};

export default ContinueWatchingSection;
