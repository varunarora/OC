def trim(s):
    """
    Removes partial unicode characters from the end of the string.
    "34\u2345\u3456" remains untouched.
    "34\u2345\u3456\u45" would have its last \u and later characters removed.
    "34\u2345\u3456\" would have its last backslash removed.
    "" is an edge case, which would be returned unchanged.
    """
    
    if not s:               # Checking for empty strings, PEP-8 style
        return s
    
    if s[-1] == "\\":       # Need to escape backslashes.
        return s[:-1]
                    
    else:
        # Search for last occurance of "\u" in the last five characters.
        # If found, return everything before it occurs.
        # Otherwise, just return the whole string unchanged.
        loc = s.rfind("\u", -5)

        if (loc != -1):
            return s[:loc]
        else:
            return s


def isTrimmed(s):
    """
    A string is "trimmed" if there's no partial unicode encoding at the end.

    "\u9000" is ok, but "a\u900", "asdf\u" and "asdfg\" are not.
     654321              654321    654321       654321           <- indexes
    
    So, we return True if the string is empty, or if both these are true:
    i)   There is no instance of \u in the last five characters.
    ii)  The last character is not a '\'.
    """

    if not s:
        return True

    else:
        condition1 = (s.rfind("\u", -5) == -1)
        condition2 = (s[-1] != "\\")

        return condition1 and condition2


